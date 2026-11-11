// Donor "My gifts" data (server only). The donor is identified by the httpOnly cookie set after a
// verified PayPal payment (no real login in this demo).
import { cookies } from "next/headers";
import { MessageType, OrderStatus, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";
import { proofAllowsDelivery } from "@/lib/proof-check";
import { sweepExpiredHolds } from "@/lib/holds";

export const DONOR_COOKIE = "giftly_donor";

export async function getCurrentDonor() {
  const id = (await cookies()).get(DONOR_COOKIE)?.value;
  if (!id) return null;
  return db.donor.findUnique({ where: { id }, select: { id: true, displayName: true, anonymous: true } });
}

export type DonorGift = {
  orderId: string;
  type: "CASH" | "GIFT" | "HYBRID";
  totalCents: number;
  authorizedCents: number | null;
  charity: { name: string; slug: string };
  paidAt: string;
  payment: "CHARGED" | "HELD" | "RELEASED"; // HELD: PayPal hold, charged when the charity buys the gift
  holdExpiresAt: string | null;
  chargedAt: string | null;
  item: {
    buyBlockedReason: string | null;
    title: string;
    merchant: string;
    imageUrl: string | null;
    productUrl: string;
    priceCents: number;
    status: string;
    boughtAt: string | null;
    deliveredAt: string | null;
    receiptChecked: boolean;
  } | null;
  thankYou: string | null;
};

export async function getDonorGifts(donorId: string): Promise<DonorGift[]> {
  await sweepExpiredHolds();
  const orders = await db.order.findMany({
    where: {
      donorId,
      OR: [
        { status: { in: [OrderStatus.RECEIVED, OrderStatus.PAID] } },
        { status: OrderStatus.CANCELLED, paymentState: PaymentState.VOIDED }, // released holds: shown so the donor knows
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      totalCents: true,
      authorizedCents: true,
      createdAt: true,
      paymentState: true,
      holdExpiresAt: true,
      capturedAt: true,
      charity: { select: { name: true, slug: true } },
      items: {
        take: 1,
        select: {
          buyBlockedReason: true,
          productTitle: true,
          merchant: true,
          imageUrl: true,
          productUrl: true,
          priceAtPaymentCents: true,
          priceAtRecommendationCents: true,
          status: true,
          boughtAt: true,
          deliveredAt: true,
          proofs: { orderBy: { createdAt: "desc" }, take: 1, select: { aiResult: true, adminDecision: true } },
        },
      },
      messages: { where: { type: MessageType.THANK_YOU }, orderBy: { createdAt: "desc" }, take: 1, select: { text: true } },
    },
  });

  return orders.map((o) => {
    const i = o.items[0];
    return {
      orderId: o.id,
      type: o.type,
      totalCents: o.totalCents,
      authorizedCents: o.authorizedCents,
      charity: o.charity,
      paidAt: o.createdAt.toISOString(),
      payment: (o.paymentState === "AUTHORIZED" ? "HELD" : o.paymentState === "VOIDED" ? "RELEASED" : "CHARGED") as DonorGift["payment"],
      holdExpiresAt: o.paymentState === "AUTHORIZED" ? (o.holdExpiresAt?.toISOString() ?? null) : null,
      chargedAt: o.capturedAt?.toISOString() ?? null,
      item: i
        ? {
            buyBlockedReason: i.buyBlockedReason,
            title: i.productTitle,
            merchant: i.merchant,
            imageUrl: i.imageUrl,
            productUrl: i.productUrl,
            priceCents: i.priceAtPaymentCents ?? i.priceAtRecommendationCents,
            status: i.status,
            boughtAt: i.boughtAt?.toISOString() ?? null,
            deliveredAt: i.deliveredAt?.toISOString() ?? null,
            receiptChecked: proofAllowsDelivery(i.proofs[0]),
          }
        : null,
      thankYou: o.messages[0]?.text ?? null,
    };
  });
}
