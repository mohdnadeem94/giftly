"use server";

import { cookies } from "next/headers";
import { ItemStatus, OrderStatus, OrderType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { GivingError, decodeSpec, encodeSpec, resolveGiving, type GivingSpec } from "@/lib/giving";
import { capturePayPalOrder, createPayPalOrder, verifyCapturedOrder } from "@/lib/paypal";

const DONOR_COOKIE = "giftly_donor";

type Fail = { ok: false; error: string };

export type StartInput =
  | { mode: "cash"; charitySlug: string; cashCents: number }
  | { mode: "gift"; charitySlug: string; needId: string };

/**
 * Step 1 of checkout: build the PayPal order on the server.
 * Nothing is saved in our database yet, so a cancelled payment leaves no record.
 */
export async function startCheckout(input: StartInput): Promise<{ ok: true; paypalOrderId: string } | Fail> {
  try {
    const charity = await db.charity.findUnique({ where: { slug: input.charitySlug }, select: { id: true } });
    if (!charity) return { ok: false, error: "That charity could not be found." };

    let spec: GivingSpec;
    if (input.mode === "cash") {
      spec = { kind: "cash", charityId: charity.id, cents: Math.round(Number(input.cashCents)) };
    } else {
      spec = { kind: "need", needId: String(input.needId) };
    }

    const resolved = await resolveGiving(spec);
    if (resolved.charityId !== charity.id) return { ok: false, error: "That gift belongs to a different charity." };

    const paypalOrderId = await createPayPalOrder({
      amountCents: resolved.amountCents,
      customId: encodeSpec(spec),
      description: resolved.description,
    });
    return { ok: true, paypalOrderId };
  } catch (err) {
    if (err instanceof GivingError) return { ok: false, error: err.message };
    console.error("startCheckout failed", err);
    return { ok: false, error: "We couldn't start the PayPal checkout. Please try again." };
  }
}

function cleanName(name: string | undefined): string {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return trimmed || "Friend of Giftly";
}

/**
 * Step 2 of checkout: capture, then VERIFY with PayPal, then save.
 * The saved amount is the verified captured amount, and it must equal what our database says.
 */
export async function finishCheckout(
  paypalOrderId: string,
  donorInput: { displayName?: string; anonymous?: boolean }
): Promise<{ ok: true; ref: string } | Fail> {
  if (typeof paypalOrderId !== "string" || !/^[A-Z0-9-]{5,40}$/i.test(paypalOrderId)) {
    return { ok: false, error: "Invalid payment reference." };
  }

  // Already recorded (e.g. a double click)? Return the existing record.
  const existing = await db.order.findUnique({ where: { paypalOrderId }, select: { id: true } });
  if (existing) return { ok: true, ref: existing.id };

  try {
    await capturePayPalOrder(paypalOrderId);
  } catch (err) {
    // Capture can fail if it was already captured; verification below decides.
    console.warn("capture call failed, verifying order state", err);
  }

  try {
    const verified = await verifyCapturedOrder(paypalOrderId);
    if (!verified) return { ok: false, error: "PayPal did not confirm this payment, so nothing was charged or saved." };

    const spec = decodeSpec(verified.customId);
    if (!spec) return { ok: false, error: "This payment does not belong to Giftly." };

    const resolved = await resolveGiving(spec);
    if (verified.capturedCents !== resolved.amountCents) {
      console.error("amount mismatch", { paypalOrderId, captured: verified.capturedCents, expected: resolved.amountCents });
      return { ok: false, error: "The paid amount did not match our records. Please contact support." };
    }

    const store = await cookies();
    const donorCookie = store.get(DONOR_COOKIE)?.value;

    const order = await db.$transaction(async (tx) => {
      let donorId: string | null = null;
      if (donorCookie) {
        const d = await tx.donor.findUnique({ where: { id: donorCookie }, select: { id: true } });
        if (d) {
          donorId = d.id;
          await tx.donor.update({
            where: { id: d.id },
            data: { displayName: cleanName(donorInput.displayName), anonymous: !!donorInput.anonymous },
          });
        }
      }
      if (!donorId) {
        const d = await tx.donor.create({
          data: {
            displayName: cleanName(donorInput.displayName),
            anonymous: !!donorInput.anonymous,
            email: verified.payerEmail, // PRIVATE
          },
        });
        donorId = d.id;
      }

      return tx.order.create({
        data: {
          donorId,
          charityId: resolved.charityId,
          type: resolved.type === "CASH" ? OrderType.CASH : OrderType.GIFT,
          totalCents: verified.capturedCents,
          cashCents: resolved.type === "CASH" ? verified.capturedCents : 0,
          paypalOrderId, // PRIVATE
          status: resolved.type === "CASH" ? OrderStatus.RECEIVED : OrderStatus.PAID,
          items: resolved.need
            ? {
                create: [
                  {
                    needId: resolved.need.id,
                    productTitle: resolved.need.title,
                    merchant: "Chosen by the charity",
                    productUrl: "",
                    priceAtRecommendationCents: resolved.need.priceCents,
                    priceAtPaymentCents: verified.capturedCents,
                    ageRange: resolved.need.ageGroup,
                    status: ItemStatus.PAID,
                  },
                ],
              }
            : undefined,
        },
        select: { id: true, donorId: true },
      });
    });

    if (order.donorId) {
      store.set(DONOR_COOKIE, order.donorId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
        secure: process.env.NODE_ENV === "production",
      });
    }

    return { ok: true, ref: order.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.order.findUnique({ where: { paypalOrderId }, select: { id: true } });
      if (again) return { ok: true, ref: again.id };
    }
    if (err instanceof GivingError) return { ok: false, error: err.message };
    console.error("finishCheckout failed", err);
    return { ok: false, error: "We couldn't confirm your payment. If you were charged, it will be reviewed." };
  }
}
