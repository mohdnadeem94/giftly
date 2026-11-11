// Donor "My gifts" data (server only). The donor is identified by the httpOnly cookie set after a
// verified PayPal payment (no real login in this demo).
import { cookies } from "next/headers";
import { MessageType, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { proofAllowsDelivery } from "@/lib/proof-check";

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
  charity: { name: string; slug: string };
  paidAt: string;
  item: {
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
  const orders = await db.order.findMany({
    where: { donorId, status: { in: [OrderStatus.RECEIVED, OrderStatus.PAID] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      totalCents: true,
      createdAt: true,
      charity: { select: { name: true, slug: true } },
      items: {
        take: 1,
        select: {
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
      charity: o.charity,
      paidAt: o.createdAt.toISOString(),
      item: i
        ? {
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
