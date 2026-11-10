// Data for the charity dashboard (server only). Always scoped to ONE charity.
import { ItemStatus, OrderStatus, OrderType } from "@prisma/client";
import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";

export type CharityGiftRow = {
  id: string; // OrderItem id
  productTitle: string;
  merchant: string;
  productUrl: string;
  imageUrl: string | null;
  ageRange: string | null;
  priceCents: number;
  status: "PAID" | "BOUGHT" | "DELIVERED";
  donor: string; // display name, "Anonymous" or "Guest" (never an email)
  proof: string | null; // latest proof result (Step 8)
  orderedAt: string;
  updatedAt: string;
};

/**
 * Resolve which charity the demo session acts as. Only the Charity and Admin roles get one.
 * (Demo roles are a UI convenience; every server action re-checks this.)
 */
export async function getActingCharity(): Promise<{ id: string; slug: string; name: string; role: "charity" | "admin" } | null> {
  const { role, charitySlug } = await getDemoSession();
  if (role !== "charity" && role !== "admin") return null;
  const charity =
    (charitySlug &&
      (await db.charity.findUnique({ where: { slug: charitySlug }, select: { id: true, slug: true, name: true } }))) ||
    (await db.charity.findFirst({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }));
  return charity ? { ...charity, role } : null;
}

const GIFT_STATUSES = [ItemStatus.PAID, ItemStatus.BOUGHT, ItemStatus.DELIVERED];

export const giftRowSelect = {
  id: true,
  productTitle: true,
  merchant: true,
  productUrl: true,
  imageUrl: true,
  ageRange: true,
  priceAtPaymentCents: true,
  priceAtRecommendationCents: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { donor: { select: { displayName: true, anonymous: true } } } },
  proofs: { orderBy: { createdAt: "desc" as const }, take: 1, select: { aiResult: true, adminDecision: true } },
};

type GiftRowRecord = {
  id: string;
  productTitle: string;
  merchant: string;
  productUrl: string;
  imageUrl: string | null;
  ageRange: string | null;
  priceAtPaymentCents: number | null;
  priceAtRecommendationCents: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
  order: { donor: { displayName: string; anonymous: boolean } | null };
  proofs: { aiResult: string | null; adminDecision: string | null }[];
};

export function toGiftRow(r: GiftRowRecord): CharityGiftRow {
  const donor = r.order.donor;
  const proof = r.proofs[0];
  return {
    id: r.id,
    productTitle: r.productTitle,
    merchant: r.merchant,
    productUrl: r.productUrl,
    imageUrl: r.imageUrl,
    ageRange: r.ageRange,
    priceCents: r.priceAtPaymentCents ?? r.priceAtRecommendationCents,
    status: r.status as CharityGiftRow["status"],
    donor: !donor ? "Guest" : donor.anonymous ? "Anonymous" : donor.displayName,
    proof: proof ? (proof.adminDecision ?? proof.aiResult ?? "UPLOADED") : null,
    orderedAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getCharityGifts(charityId: string): Promise<CharityGiftRow[]> {
  const rows = await db.orderItem.findMany({
    where: {
      status: { in: GIFT_STATUSES },
      order: { charityId, status: OrderStatus.PAID }, // never drafts
    },
    orderBy: { createdAt: "desc" },
    select: giftRowSelect,
  });
  return rows.map(toGiftRow);
}

export async function getCharitySummary(charityId: string) {
  const [cash, gifts] = await Promise.all([
    db.order.aggregate({
      where: { charityId, type: OrderType.CASH, status: OrderStatus.RECEIVED },
      _sum: { totalCents: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { charityId, type: { in: [OrderType.GIFT, OrderType.HYBRID] }, status: OrderStatus.PAID },
      _sum: { totalCents: true },
    }),
  ]);
  return {
    cashCents: cash._sum.totalCents ?? 0,
    cashCount: cash._count,
    giftCents: gifts._sum.totalCents ?? 0,
  };
}
