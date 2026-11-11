// Admin console data (server only): a platform-wide view across ALL charities.
// Only the Admin demo role may call these (checked by the page and the actions).
import { ItemStatus, OrderStatus, PaymentState, ProofResult } from "@prisma/client";
import { db } from "@/lib/db";
import { sweepExpiredHolds } from "@/lib/holds";

const COUNTED_WHERE = { status: { in: [OrderStatus.RECEIVED, OrderStatus.PAID] }, paymentState: PaymentState.CAPTURED };

export type AdminOverview = {
  raisedCents: number;
  heldCents: number;
  heldCount: number;
  toBuy: number;
  toDeliver: number;
  delivered: number;
  releasedHolds: number;
  receiptsToReview: number;
};

export type ReviewItem = {
  proofId: string;
  itemId: string;
  productTitle: string;
  merchant: string;
  priceCents: number;
  charityName: string;
  aiResult: ProofResult | null;
  aiNotes: string | null;
  uploadedAt: string;
};

export type HeldGift = {
  orderId: string;
  productTitle: string;
  charityName: string;
  cents: number;
  heldAt: string;
  expiresAt: string | null;
  blocked: string | null;
};

export type CharityRow = {
  slug: string;
  name: string;
  raisedCents: number;
  goalCents: number;
  held: number;
  toBuy: number;
  toDeliver: number;
  delivered: number;
};

/** Latest receipt per bought gift that needs a human: AI said MISMATCH/UNCLEAR (or no verdict) and no admin decision yet. */
async function reviewQueue(): Promise<ReviewItem[]> {
  const proofs = await db.proof.findMany({
    where: { orderItem: { status: ItemStatus.BOUGHT, order: { paymentState: PaymentState.CAPTURED } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      aiResult: true,
      aiNotes: true,
      adminDecision: true,
      createdAt: true,
      orderItem: {
        select: {
          id: true,
          productTitle: true,
          merchant: true,
          priceAtPaymentCents: true,
          priceAtRecommendationCents: true,
          order: { select: { charity: { select: { name: true } } } },
        },
      },
    },
  });
  const seen = new Set<string>();
  const out: ReviewItem[] = [];
  for (const p of proofs) {
    if (seen.has(p.orderItem.id)) continue; // only the newest receipt per gift counts
    seen.add(p.orderItem.id);
    if (p.adminDecision || p.aiResult === ProofResult.MATCH) continue;
    out.push({
      proofId: p.id,
      itemId: p.orderItem.id,
      productTitle: p.orderItem.productTitle,
      merchant: p.orderItem.merchant,
      priceCents: p.orderItem.priceAtPaymentCents ?? p.orderItem.priceAtRecommendationCents,
      charityName: p.orderItem.order.charity.name,
      aiResult: p.aiResult,
      aiNotes: p.aiNotes,
      uploadedAt: p.createdAt.toISOString(),
    });
  }
  return out;
}

export async function getAdminData() {
  await sweepExpiredHolds();
  const [raised, held, toBuy, toDeliver, delivered, releasedHolds, queue, heldOrders, charities, perCharity] = await Promise.all([
    db.order.aggregate({ where: COUNTED_WHERE, _sum: { totalCents: true } }),
    db.order.aggregate({ where: { paymentState: PaymentState.AUTHORIZED }, _sum: { totalCents: true }, _count: true }),
    db.orderItem.count({ where: { status: ItemStatus.PAID, order: { status: OrderStatus.PAID } } }),
    db.orderItem.count({ where: { status: ItemStatus.BOUGHT, order: COUNTED_WHERE } }),
    db.orderItem.count({ where: { status: ItemStatus.DELIVERED, order: COUNTED_WHERE } }),
    db.order.count({ where: { paymentState: PaymentState.VOIDED } }),
    reviewQueue(),
    db.order.findMany({
      where: { paymentState: PaymentState.AUTHORIZED },
      orderBy: { holdExpiresAt: "asc" },
      take: 100,
      select: {
        id: true,
        totalCents: true,
        createdAt: true,
        holdExpiresAt: true,
        charity: { select: { name: true } },
        items: { select: { productTitle: true, buyBlockedReason: true }, take: 1 },
      },
    }),
    db.charity.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, goalCents: true } }),
    db.order.groupBy({ by: ["charityId"], where: COUNTED_WHERE, _sum: { totalCents: true } }),
  ]);

  const itemCounts = await db.orderItem.groupBy({
    by: ["status", "orderId"],
    where: { status: { in: [ItemStatus.PAID, ItemStatus.BOUGHT, ItemStatus.DELIVERED] }, order: { status: OrderStatus.PAID } },
  });
  // Map orderId -> charity + payment state to attribute item counts per charity.
  const orderInfo = new Map(
    (
      await db.order.findMany({
        where: { id: { in: [...new Set(itemCounts.map((i) => i.orderId))] } },
        select: { id: true, charityId: true, paymentState: true },
      })
    ).map((o) => [o.id, o])
  );

  const charityRows: CharityRow[] = charities.map((c) => {
    const row: CharityRow = {
      slug: c.slug,
      name: c.name,
      goalCents: c.goalCents,
      raisedCents: perCharity.find((p) => p.charityId === c.id)?._sum.totalCents ?? 0,
      held: 0,
      toBuy: 0,
      toDeliver: 0,
      delivered: 0,
    };
    for (const i of itemCounts) {
      const o = orderInfo.get(i.orderId);
      if (!o || o.charityId !== c.id) continue;
      if (i.status === ItemStatus.PAID) {
        row.toBuy++;
        if (o.paymentState === PaymentState.AUTHORIZED) row.held++;
      } else if (i.status === ItemStatus.BOUGHT) row.toDeliver++;
      else if (i.status === ItemStatus.DELIVERED) row.delivered++;
    }
    return row;
  });

  const overview: AdminOverview = {
    raisedCents: raised._sum.totalCents ?? 0,
    heldCents: held._sum.totalCents ?? 0,
    heldCount: held._count,
    toBuy,
    toDeliver,
    delivered,
    releasedHolds,
    receiptsToReview: queue.length,
  };

  const heldGifts: HeldGift[] = heldOrders.map((o) => ({
    orderId: o.id,
    productTitle: o.items[0]?.productTitle ?? "Gift",
    charityName: o.charity.name,
    cents: o.totalCents,
    heldAt: o.createdAt.toISOString(),
    expiresAt: o.holdExpiresAt?.toISOString() ?? null,
    blocked: o.items[0]?.buyBlockedReason ?? null,
  }));

  return { overview, queue, heldGifts, charities: charityRows };
}
