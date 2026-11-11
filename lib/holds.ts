// Gift payment holds (server only).
// Gifts are AUTHORIZED at checkout: PayPal holds the donor's money but does not charge it.
//  - When the charity clicks "Buy this gift", we CAPTURE the hold: the donor is charged and the charity
//    gets the money to buy with, so it never pays out of its own pocket.
//  - If the charity doesn't buy within HOLD_HOURS (72h), or releases the gift, we VOID the hold:
//    the donor is never charged.
// PayPal itself keeps a hold valid for up to 29 days; the 72-hour rule is Giftly's, enforced here.
import { ItemStatus, OrderStatus, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";
import { captureAuthorization, voidAuthorization } from "@/lib/paypal";

const configured = process.env.NODE_ENV === "production" ? 72 : Number(process.env.GIFT_HOLD_HOURS);
/** How long a gift payment stays on hold before it is released automatically. */
export const HOLD_HOURS = Number.isFinite(configured) && configured > 0 && configured <= 72 ? configured : 72;
export const HOLD_MS = HOLD_HOURS * 60 * 60 * 1000;

export class HoldError extends Error {}

/** When a new hold should be released: 72h from now, or PayPal's own expiry if that is sooner. */
export function holdExpiry(paypalExpiresAt: Date | null, now = new Date()): Date {
  const ours = new Date(now.getTime() + HOLD_MS);
  return paypalExpiresAt && paypalExpiresAt < ours ? paypalExpiresAt : ours;
}

/**
 * Release a held gift payment. The donor is not charged, the order is cancelled and the gift leaves
 * the charity's list. Only acts on orders that are still held.
 */
export async function releaseHold(orderId: string, reason: "EXPIRED" | "CHARITY_RELEASED"): Promise<boolean> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentState: true, paypalAuthorizationId: true },
    });
    if (!order || order.paymentState !== PaymentState.AUTHORIZED) return false;

    if (!order.paypalAuthorizationId) return false;
    const voided = await voidAuthorization(order.paypalAuthorizationId);
    if (!voided) return false; // keep it held; the next sweep tries again

    const now = new Date();
    const updated = await tx.order.updateMany({
      where: { id: order.id, paymentState: PaymentState.AUTHORIZED },
      data: { paymentState: PaymentState.VOIDED, status: OrderStatus.CANCELLED, voidedAt: now },
    });
    if (updated.count > 0) {
      await tx.orderItem.updateMany({ where: { orderId: order.id, status: ItemStatus.PAID }, data: { status: ItemStatus.PENDING } });
      console.info("gift hold released", { orderId: order.id, reason });
    }
    return updated.count > 0;
  }, { timeout: 60000 });
}

/**
 * Charge a held gift because the charity is buying it now. Amount = our stored total, checked against PayPal.
 * Throws HoldError with a friendly message if it can't be charged.
 */
export async function captureHold(orderId: string, amountCents?: number): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalCents: true, paymentState: true, paypalAuthorizationId: true, holdExpiresAt: true, authorizedCents: true },
    });
    if (!order) throw new HoldError("Order not found.");
    if (order.paymentState === PaymentState.CAPTURED) return; // already charged (e.g. seeded or a retry)
    if (order.paymentState !== PaymentState.AUTHORIZED || !order.paypalAuthorizationId) {
      throw new HoldError("This gift's payment hold was already released.");
    }
    if (!order.holdExpiresAt || order.holdExpiresAt <= new Date()) {
      throw new HoldError(`This gift's payment hold has expired or has no valid expiry. No new charge was made; expired holds are released automatically.`);
    }

    const cents = amountCents ?? order.totalCents;
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents > Math.min(order.totalCents, order.authorizedCents ?? order.totalCents)) {
      throw new HoldError("The charge must be positive and cannot exceed the donor's held amount.");
    }
    let result: Awaited<ReturnType<typeof captureAuthorization>>;
    try {
      result = await captureAuthorization(order.paypalAuthorizationId, cents);
    } catch (err) {
      console.error("capture of held gift failed", { orderId });
      throw new HoldError("PayPal couldn't charge the held payment. Please try again in a moment.");
    }
    if (!result.ok) {
      console.error("capture mismatch", { orderId, status: result.status, cents: result.cents, expected: cents });
      throw new HoldError("PayPal didn't confirm the charge for this gift.");
    }

    const updated = await tx.order.updateMany({
      where: { id: order.id, paymentState: PaymentState.AUTHORIZED },
      data: { paymentState: PaymentState.CAPTURED, capturedAt: new Date(), totalCents: cents,
        authorizedCents: order.authorizedCents ?? order.totalCents },
    });
    if (updated.count) await tx.orderItem.updateMany({
      where: { orderId: order.id }, data: { priceAtPaymentCents: cents },
    });
  }, { timeout: 60000 });
}

/** Release every hold that is past its 72-hour limit. Returns how many were released. */
export async function releaseExpiredHolds(limit = 25): Promise<number> {
  const expired = await db.order.findMany({
    where: { paymentState: PaymentState.AUTHORIZED, holdExpiresAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let released = 0;
  for (const o of expired) if (await releaseHold(o.id, "EXPIRED")) released++;
  return released;
}

let lastSweep = 0;
/**
 * Cheap safety net: pages that show gifts call this, so expired holds are released even without a
 * scheduled job. Runs at most once a minute per server and never throws.
 */
export async function sweepExpiredHolds(): Promise<void> {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  try {
    await releaseExpiredHolds();
  } catch (err) {
    console.error("hold sweep failed");
  }
}
