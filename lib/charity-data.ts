// Data for the charity dashboard (server only). Always scoped to ONE charity.
import { ItemStatus, OrderStatus, OrderType, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import { proofAllowsDelivery } from "@/lib/proof-check";
import { checkBeforeBuy } from "@/lib/buy-check";
import { money } from "@/lib/format";
import { sweepExpiredHolds } from "@/lib/holds";

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
  proof: string | null; // latest proof status: MATCH | MISMATCH | UNCLEAR | APPROVED | REJECTED | UPLOADED
  proofId: string | null;
  proofNotes: string | null; // AI's short note about the receipt
  proofAiResult: string | null;
  canDeliver: boolean; // a matching or admin-approved receipt exists
  availability: string;
  availabilityDetails: string;
  buyBlockedReason: string | null;
  held: boolean; // donor's payment is on hold: charged when the charity buys the gift
  holdExpiresAt: string | null; // hold is released automatically at this time
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
  externalId: true,
  productTitle: true,
  merchant: true,
  productUrl: true,
  imageUrl: true,
  ageRange: true,
  buyBlockedReason: true,
  priceAtPaymentCents: true,
  priceAtRecommendationCents: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { totalCents: true, paymentState: true, holdExpiresAt: true, donor: { select: { displayName: true, anonymous: true } } } },
  proofs: { orderBy: { createdAt: "desc" as const }, take: 1, select: { id: true, aiResult: true, aiNotes: true, adminDecision: true } },
};

type GiftRowRecord = {
  id: string;
  externalId: string | null;
  productTitle: string;
  merchant: string;
  productUrl: string;
  imageUrl: string | null;
  ageRange: string | null;
  buyBlockedReason: string | null;
  priceAtPaymentCents: number | null;
  priceAtRecommendationCents: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
  order: { totalCents: number; paymentState: string; holdExpiresAt: Date | null; donor: { displayName: string; anonymous: boolean } | null };
  proofs: { id: string; aiResult: string | null; aiNotes: string | null; adminDecision: string | null }[];
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
    proofId: proof?.id ?? null,
    proofNotes: proof?.aiNotes ?? null,
    proofAiResult: proof?.aiResult ?? null,
    canDeliver: proofAllowsDelivery(proof),
    availability: r.buyBlockedReason === "PRICE_UP" ? "Price went up" : r.buyBlockedReason === "SOLD_OUT" ? "Sold out"
      : r.status === "DELIVERED" ? "Delivered" : r.status === "BOUGHT" ? "Already bought"
      : !r.externalId ? "Charity chooses" : "Not checked",
    availabilityDetails: r.buyBlockedReason ? "Purchase blocked. The donor has not been charged; the hold will be released automatically."
      : !r.externalId ? "Wishlist item: the charity chooses the product, so live stock cannot be checked." : "Stock and price are re-checked before charging a held payment.",
    buyBlockedReason: r.buyBlockedReason,
    held: r.order.paymentState === "AUTHORIZED",
    holdExpiresAt: r.order.paymentState === "AUTHORIZED" ? (r.order.holdExpiresAt?.toISOString() ?? null) : null,
    orderedAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getCharityGifts(charityId: string): Promise<CharityGiftRow[]> {
  await sweepExpiredHolds(); // release holds older than 72 hours before showing the list
  const rows = await db.orderItem.findMany({
    where: {
      status: { in: GIFT_STATUSES },
      order: { charityId, status: OrderStatus.PAID }, // never drafts
    },
    orderBy: { createdAt: "desc" },
    select: giftRowSelect,
  });
  const gifts = rows.map(toGiftRow);
  // Read-only previews: bounded requests, no capture and no permanent block until Buy.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      const record = rows[index];
      const gift = gifts[index];
      if (!gift.held || record.status !== ItemStatus.PAID || record.buyBlockedReason || !record.externalId) continue;
      const check = await checkBeforeBuy(record);
      const checkedAt = new Date().toISOString();
      if (check.action === "BLOCK") {
        gift.availability = check.reason === "PRICE_UP" ? "Price went up" : "Sold out";
        gift.availabilityDetails = check.reason === "PRICE_UP"
          ? `Latest price ${money(check.liveCents!)} exceeds ${money(record.order.totalCents)} held. Buy will block the charge.`
          : "The catalog has no available offer for this item. Buy will block the charge.";
      } else {
        gift.availability = check.availability === "UNAVAILABLE" ? "Check unavailable"
          : check.availability === "UNKNOWN" ? "Stock unconfirmed"
          : check.cents < record.order.totalCents ? "Available for less" : "Available";
        gift.availabilityDetails = check.availability === "UNAVAILABLE"
          ? "Channel3 could not be reached. Buying uses the stored approved amount if the check still fails."
          : `${money(check.cents)} at ${check.merchant}.${check.availability === "UNKNOWN" ? " Store did not report stock." : ""} Price and stock are checked again when you click Buy.`;
      }
      gift.availabilityDetails += ` Checked ${checkedAt}. Refresh availability for a new check.`;
    }
  }));
  return gifts;
}

/** Cash received (cash donations plus the cash part of gift+cash orders). Gift totals come from the gift rows. */
export async function getCharitySummary(charityId: string) {
  const [cash, cashOnly] = await Promise.all([
    db.order.aggregate({
      where: { charityId, status: { in: [OrderStatus.RECEIVED, OrderStatus.PAID] }, paymentState: PaymentState.CAPTURED, cashCents: { gt: 0 } },
      _sum: { cashCents: true },
      _count: true,
    }),
    db.order.count({ where: { charityId, type: OrderType.CASH, status: OrderStatus.RECEIVED } }),
  ]);
  return {
    cashCents: cash._sum.cashCents ?? 0,
    cashCount: cash._count,
    cashOnlyCount: cashOnly,
  };
}
