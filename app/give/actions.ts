"use server";

import { cookies } from "next/headers";
import { ItemStatus, OrderStatus, OrderType, PaymentState, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Channel3Error, getGiftProduct } from "@/lib/channel3";
import { CASH_MIN_CENTS, CASH_MAX_CENTS, GIFT_MAX_CENTS, GivingError, decodeSpec, encodeSpec, resolveGiving, type GivingSpec } from "@/lib/giving";
import { authorizePayPalOrder, capturePayPalOrder, createPayPalOrder, getPayPalOrder, verifyPayPalOrder } from "@/lib/paypal";
import { holdExpiry } from "@/lib/holds";
import { canGive } from "@/lib/roles";
import { getDemoSession } from "@/lib/session";

const SIGN_IN_ERROR = "Please sign in as a donor to give.";

const DONOR_COOKIE = "giftly_donor";

type Fail = { ok: false; error: string; code?: "PRICE_CHANGED" | "UNAVAILABLE" };

export type StartInput =
  | { mode: "cash"; charitySlug: string; cashCents: number }
  | { mode: "gift"; charitySlug: string; needId: string }
  | { mode: "item"; charitySlug: string; orderItemId: string };

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The donor picked a real product from Channel3 search.
 * We ignore anything the browser says about the product except its ID, fetch the live product
 * from Channel3 on the server, and save a PENDING draft with that exact title, merchant, URL and price.
 */
export async function createGiftDraft(input: {
  charitySlug: string;
  productId: string;
  ageRange?: string;
}): Promise<{ ok: true; orderItemId: string } | Fail> {
  if (!canGive((await getDemoSession()).role)) return { ok: false, error: SIGN_IN_ERROR };
  try {
    const charity = await db.charity.findUnique({ where: { slug: String(input.charitySlug) }, select: { id: true } });
    if (!charity) return { ok: false, error: "That charity could not be found." };

    const product = await getGiftProduct(String(input.productId));
    if (!product || product.inStock === false) return { ok: false, error: "That product is no longer available. Please pick another.", code: "UNAVAILABLE" };
    if (product.priceCents > GIFT_MAX_CENTS) return { ok: false, error: "Gifts are limited to $500 in this demo." };

    const ageRange = typeof input.ageRange === "string" ? input.ageRange.slice(0, 20) : null;

    const order = await db.order.create({
      data: {
        charityId: charity.id,
        type: OrderType.GIFT,
        totalCents: product.priceCents,
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              externalId: product.id,
              productTitle: product.title,
              merchant: product.merchant,
              productUrl: product.productUrl,
              imageUrl: product.imageUrl,
              priceAtRecommendationCents: product.priceCents,
              ageRange,
              status: ItemStatus.PENDING,
            },
          ],
        },
      },
      select: { items: { select: { id: true } } },
    });
    return { ok: true, orderItemId: order.items[0].id };
  } catch (err) {
    console.error("createGiftDraft failed");
    if (err instanceof Channel3Error && err.status === 503) return { ok: false, error: "Product search isn't configured yet." };
    return { ok: false, error: "We couldn't save that gift. Please try again." };
  }
}

/**
 * Step 1 of checkout: build the PayPal order on the server.
 * Cash proposals are saved as pending drafts before their database amount is sent to PayPal.
 */
export async function startCheckout(input: StartInput): Promise<{ ok: true; paypalOrderId: string } | Fail> {
  if (!canGive((await getDemoSession()).role)) return { ok: false, error: SIGN_IN_ERROR };
  try {
    const charity = await db.charity.findUnique({ where: { slug: input.charitySlug }, select: { id: true } });
    if (!charity) return { ok: false, error: "That charity could not be found." };

    let spec: GivingSpec;
    if (input.mode === "cash") {
      const cents = input.cashCents;
      if (!Number.isSafeInteger(cents) || cents < CASH_MIN_CENTS || cents > CASH_MAX_CENTS) {
        return { ok: false, error: "Please choose a whole-cent amount between $1 and $500." };
      }
      const draft = await db.order.create({ data: {
        charityId: charity.id, type: OrderType.CASH, status: OrderStatus.PENDING, totalCents: cents, cashCents: cents,
      }, select: { id: true } });
      spec = { kind: "cash", charityId: charity.id, cents: 0, orderId: draft.id };
    } else if (input.mode === "item") {
      spec = { kind: "item", orderItemId: String(input.orderItemId) };
    } else {
      spec = { kind: "need", needId: String(input.needId) };
    }

    const resolved = await resolveGiving(spec);
    if (resolved.charityId !== charity.id) return { ok: false, error: "That gift belongs to a different charity." };

    // Product gifts: must still be a draft, and the live price must match what the donor saw.
    if (resolved.draft) {
      if (resolved.draft.itemStatus !== "PENDING" || resolved.draft.orderStatus !== "PENDING") {
        return { ok: false, error: "This gift has already been paid for." };
      }
      if (resolved.draft.externalId) {
        const live = await getGiftProduct(resolved.draft.externalId);
        if (!live || live.inStock === false) {
          return { ok: false, error: "This product is no longer available. Please pick another gift.", code: "UNAVAILABLE" };
        }
        if (live.priceCents !== resolved.amountCents) {
          return {
            ok: false,
            code: "PRICE_CHANGED",
            error: `The price just changed from ${money(resolved.amountCents)} to ${money(live.priceCents)}. Pick the gift again to see the new price, or choose another.`,
          };
        }
      }
    }

    // Cash is charged at once. Gifts are only HELD: the donor is charged when the charity buys the gift,
    // and the hold is released automatically if that doesn't happen within 72 hours.
    const paypalOrderId = await createPayPalOrder({
      amountCents: resolved.amountCents,
      customId: encodeSpec(spec),
      description: resolved.description,
      intent: spec.kind === "cash" ? "CAPTURE" : "AUTHORIZE",
    });
    return { ok: true, paypalOrderId };
  } catch (err) {
    if (err instanceof GivingError) return { ok: false, error: err.message };
    console.error("startCheckout failed");
    return { ok: false, error: "We couldn't start the PayPal checkout. Please try again." };
  }
}

function cleanName(name: string | undefined): string {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return trimmed || "Friend of Giftly";
}

async function getOrCreateDonor(
  tx: Prisma.TransactionClient,
  donorCookie: string | undefined,
  donorInput: { displayName?: string; anonymous?: boolean },
  payerEmail: string | null
): Promise<string> {
  const data = { displayName: cleanName(donorInput.displayName), anonymous: !!donorInput.anonymous };
  if (donorCookie) {
    const d = await tx.donor.findUnique({ where: { id: donorCookie }, select: { id: true } });
    if (d) {
      await tx.donor.update({ where: { id: d.id }, data });
      return d.id;
    }
  }
  const d = await tx.donor.create({ data: { ...data, email: payerEmail /* PRIVATE */ } });
  return d.id;
}

/**
 * Step 2 of checkout: capture (cash) or authorize a hold (gifts), then VERIFY with PayPal, then save.
 * The saved amount is the verified amount, and it must equal what our database says.
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
    // The intent was chosen by our server in startCheckout; read it back from PayPal, not the browser.
    const before = await getPayPalOrder(paypalOrderId);
    const unit = before.purchaseUnits?.[0];
    const spec = unit?.customId ? decodeSpec(unit.customId) : null;
    if (!spec || before.purchaseUnits?.length !== 1) return { ok: false, error: "This payment does not belong to Giftly." };
    const expected = await resolveGiving(spec);
    const expectedIntent = spec.kind === "cash" ? "CAPTURE" : "AUTHORIZE";
    if (String(before.intent) !== expectedIntent || unit?.amount?.currencyCode !== "USD"
      || unit.amount.value !== (expected.amountCents / 100).toFixed(2)) {
      return { ok: false, error: "This payment does not match the saved checkout." };
    }
    if (String(before.status) !== "COMPLETED") {
      if (String(before.intent) === "AUTHORIZE") await authorizePayPalOrder(paypalOrderId);
      else await capturePayPalOrder(paypalOrderId);
    }
  } catch (err) {
    // Can fail if it was already completed; verification below decides.
    console.warn("capture/authorize call failed, verifying order state");
  }

  try {
    const verified = await verifyPayPalOrder(paypalOrderId);
    if (!verified) return { ok: false, error: "PayPal did not confirm this payment. Check your sandbox activity before trying again." };

    const spec = decodeSpec(verified.customId);
    if (!spec) return { ok: false, error: "This payment does not belong to Giftly." };
    // Cash must be a direct charge and gifts must be a hold. Anything else wasn't created by us.
    if ((spec.kind === "cash") !== (verified.intent === "CAPTURE")) {
      return { ok: false, error: "This payment does not match how Giftly set it up." };
    }

    const resolved = await resolveGiving(spec);
    if (verified.cents !== resolved.amountCents) {
      console.error("amount mismatch", { paypalOrderId, paid: verified.cents, expected: resolved.amountCents });
      return { ok: false, error: "The paid amount did not match our records. Please contact support." };
    }

    const held = verified.intent === "AUTHORIZE";
    const payment = held
      ? {
          paymentState: PaymentState.AUTHORIZED,
          authorizedCents: verified.cents,
          paypalAuthorizationId: verified.authorizationId, // PRIVATE
          holdExpiresAt: holdExpiry(verified.authorizationExpiresAt),
        }
      : { paymentState: PaymentState.CAPTURED, capturedAt: new Date() };

    const store = await cookies();
    const donorCookie = store.get(DONOR_COOKIE)?.value;

    const order = await db.$transaction(async (tx) => {
      const donorId = await getOrCreateDonor(tx, donorCookie, donorInput, verified.payerEmail);

      if (spec.kind === "cash" && spec.orderId) {
        const updated = await tx.order.updateMany({
          where: { id: spec.orderId, status: OrderStatus.PENDING },
          data: { donorId, paypalOrderId, status: OrderStatus.RECEIVED, ...payment },
        });
        if (!updated.count) throw new GivingError("This donation was already recorded.");
        return { id: spec.orderId, donorId };
      }
      // Product gift: turn the PENDING draft into a paid order (only if it is still a draft).
      if (resolved.draft) {
        const updated = await tx.order.updateMany({
          where: { id: resolved.draft.orderId, status: OrderStatus.PENDING },
          data: { donorId, paypalOrderId, status: OrderStatus.PAID, totalCents: verified.cents, ...payment },
        });
        if (updated.count === 0) throw new GivingError("This gift was already paid for.");
        await tx.orderItem.update({
          where: { id: resolved.draft.itemId },
          data: { status: ItemStatus.PAID, priceAtPaymentCents: verified.cents },
        });
        return { id: resolved.draft.orderId, donorId };
      }

      return tx.order.create({
        data: {
          donorId,
          charityId: resolved.charityId,
          type: resolved.type === "CASH" ? OrderType.CASH : OrderType.GIFT,
          totalCents: verified.cents,
          cashCents: resolved.type === "CASH" ? verified.cents : 0,
          paypalOrderId, // PRIVATE
          ...payment,
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
                    priceAtPaymentCents: verified.cents,
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
    console.error("finishCheckout failed");
    return { ok: false, error: "We couldn't confirm your payment. If you were charged, it will be reviewed." };
  }
}
