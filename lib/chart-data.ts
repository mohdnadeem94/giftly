// Aggregates for public charts (server only). Totals only: no donor names, emails or PayPal IDs.
import { OrderStatus, OrderType, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";

const COUNTED = [OrderStatus.RECEIVED, OrderStatus.PAID];
// Only money that was actually charged counts as raised. Gift payments on hold (not yet bought) don't.
const COUNTED_WHERE = { status: { in: COUNTED }, paymentState: PaymentState.CAPTURED };

export type ChartData = {
  scope: { slug: string; name: string } | null; // null = all causes
  raisedOverTime: { date: string; cash: number; gifts: number; total: number }[]; // cumulative USD by day
  byCategory: { category: string; amount: number }[];
  cashVsGifts: { type: string; amount: number }[];
  topCauses: { cause: string; slug: string; amount: number }[];
  giftStatus: { cause: string; Paid: number; Bought: number; Delivered: number }[];
  totals: { raised: number; cash: number; gifts: number; giftCount: number; delivered: number; donations: number; days: number };
};

const dollars = (cents: number) => Math.round(cents) / 100;

export async function getChartData(causeSlug?: string | null): Promise<ChartData | null> {
  let scope: ChartData["scope"] = null;
  let charityId: string | undefined;
  if (causeSlug) {
    const c = await db.charity.findUnique({ where: { slug: causeSlug }, select: { id: true, slug: true, name: true } });
    if (!c) return null;
    scope = { slug: c.slug, name: c.name };
    charityId = c.id;
  }

  const orders = await db.order.findMany({
    where: { ...COUNTED_WHERE, ...(charityId ? { charityId } : {}) },
    orderBy: { createdAt: "asc" },
    select: {
      type: true,
      totalCents: true,
      cashCents: true,
      createdAt: true,
      charity: { select: { name: true, slug: true, category: true } },
      items: { select: { status: true, priceAtPaymentCents: true, priceAtRecommendationCents: true } },
    },
  });

  // Raised over time (cumulative, per day)
  const perDay = new Map<string, { cash: number; gifts: number }>();
  const byCategory = new Map<string, number>();
  const byCause = new Map<string, { cause: string; slug: string; amount: number }>();
  const status = new Map<string, { cause: string; Paid: number; Bought: number; Delivered: number }>();
  let cashTotal = 0;
  let giftTotal = 0;
  let giftCount = 0;
  let delivered = 0;

  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    const giftCents = o.type === OrderType.CASH ? 0 : o.totalCents - o.cashCents;
    const cashCents = o.type === OrderType.CASH ? o.totalCents : o.cashCents;
    const d = perDay.get(day) ?? { cash: 0, gifts: 0 };
    d.cash += cashCents;
    d.gifts += giftCents;
    perDay.set(day, d);
    cashTotal += cashCents;
    giftTotal += giftCents;

    byCategory.set(o.charity.category, (byCategory.get(o.charity.category) ?? 0) + o.totalCents);
    const bc = byCause.get(o.charity.slug) ?? { cause: o.charity.name, slug: o.charity.slug, amount: 0 };
    bc.amount += o.totalCents;
    byCause.set(o.charity.slug, bc);

    for (const i of o.items) {
      if (i.status !== "PAID" && i.status !== "BOUGHT" && i.status !== "DELIVERED") continue;
      giftCount++;
      if (i.status === "DELIVERED") delivered++;
      const s = status.get(o.charity.slug) ?? { cause: o.charity.name, Paid: 0, Bought: 0, Delivered: 0 };
      if (i.status === "PAID") s.Paid++;
      else if (i.status === "BOUGHT") s.Bought++;
      else s.Delivered++;
      status.set(o.charity.slug, s);
    }
  }

  let runCash = 0;
  let runGifts = 0;
  const raisedOverTime = [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      runCash += v.cash;
      runGifts += v.gifts;
      return { date, cash: dollars(runCash), gifts: dollars(runGifts), total: dollars(runCash + runGifts) };
    });

  return {
    scope,
    raisedOverTime,
    byCategory: [...byCategory.entries()].map(([category, cents]) => ({ category, amount: dollars(cents) })).sort((a, b) => b.amount - a.amount),
    cashVsGifts: [
      { type: "Cash", amount: dollars(cashTotal) },
      { type: "Gifts", amount: dollars(giftTotal) },
    ],
    topCauses: [...byCause.values()].map((c) => ({ ...c, amount: dollars(c.amount) })).sort((a, b) => b.amount - a.amount),
    giftStatus: [...status.values()],
    totals: {
      raised: dollars(cashTotal + giftTotal),
      cash: dollars(cashTotal),
      gifts: dollars(giftTotal),
      giftCount,
      delivered,
      donations: orders.length,
      days: raisedOverTime.length,
    },
  };
}

/** Recent public donations across all causes (safe fields only). */
export async function getPublicFeed(limit = 100) {
  const rows = await db.order.findMany({
    where: { ...COUNTED_WHERE },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      createdAt: true,
      type: true,
      totalCents: true,
      status: true,
      charity: { select: { name: true } },
      donor: { select: { displayName: true, anonymous: true } },
      items: { select: { status: true }, take: 1 },
    },
  });
  return rows.map((o) => ({
    date: o.createdAt.toISOString(),
    displayName: !o.donor ? "Guest" : o.donor.anonymous ? "Anonymous" : o.donor.displayName,
    type: o.type,
    amountCents: o.totalCents,
    status: o.type === OrderType.CASH ? o.status : (o.items[0]?.status ?? o.status),
    cause: o.charity.name,
  }));
}
