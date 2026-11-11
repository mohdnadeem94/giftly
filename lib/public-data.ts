// Public, read-only data (server only).
// HARD RULE: every function here uses explicit `select`s and returns only safe fields.
// Never return donor emails, PayPal order IDs, or internal IDs of donors.
import { ItemStatus, NeedStatus, OrderStatus, OrderType, PaymentState } from "@prisma/client";
import { db } from "@/lib/db";

const COUNTED = [OrderStatus.RECEIVED, OrderStatus.PAID];
// Only money that was actually charged counts as raised. Gift payments on hold (not yet bought) don't.
const COUNTED_WHERE = { status: { in: COUNTED }, paymentState: PaymentState.CAPTURED };

export type PublicStats = {
  totalRaisedCents: number;
  giftsGiven: number;
  giftsDelivered: number;
  activeCauses: number;
  donors: number;
};

export async function getPublicStats(): Promise<PublicStats> {
  const [raised, giftsGiven, giftsDelivered, activeCauses, donorGroups, guestOrders] = await Promise.all([
    db.order.aggregate({ _sum: { totalCents: true }, where: { ...COUNTED_WHERE } }),
    db.orderItem.count({ where: { status: { in: [ItemStatus.PAID, ItemStatus.BOUGHT, ItemStatus.DELIVERED] }, order: COUNTED_WHERE } }),
    db.orderItem.count({ where: { status: ItemStatus.DELIVERED, order: COUNTED_WHERE } }),
    db.charity.count(),
    db.order.groupBy({ by: ["donorId"], where: { ...COUNTED_WHERE, donorId: { not: null } } }),
    db.order.count({ where: { ...COUNTED_WHERE, donorId: null } }),
  ]);

  return {
    totalRaisedCents: raised._sum.totalCents ?? 0,
    giftsGiven,
    giftsDelivered,
    activeCauses,
    donors: donorGroups.length + guestOrders, // each guest checkout counts as one donor
  };
}

export type PublicCause = {
  slug: string;
  name: string;
  category: string;
  region: string;
  photoUrl: string;
  verifiedDemo: boolean;
  goalCents: number;
  raisedCents: number;
  openNeeds: number;
};

async function raisedByCharity(): Promise<Map<string, number>> {
  const sums = await db.order.groupBy({
    by: ["charityId"],
    where: { ...COUNTED_WHERE },
    _sum: { totalCents: true },
  });
  return new Map(sums.map((s) => [s.charityId, s._sum.totalCents ?? 0]));
}

export async function listCauses(): Promise<PublicCause[]> {
  const [charities, raised] = await Promise.all([
    db.charity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        region: true,
        photoUrl: true,
        verifiedDemo: true,
        goalCents: true,
        _count: { select: { needs: { where: { status: NeedStatus.OPEN } } } },
      },
    }),
    raisedByCharity(),
  ]);

  return charities.map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.category,
    region: c.region,
    photoUrl: c.photoUrl,
    verifiedDemo: c.verifiedDemo,
    goalCents: c.goalCents,
    raisedCents: raised.get(c.id) ?? 0,
    openNeeds: c._count.needs,
  }));
}

export type PublicFeedEntry = {
  date: string;
  displayName: string; // "Anonymous" or "Guest" when appropriate
  type: OrderType;
  amountCents: number;
  status: string;
};

export type PublicCauseDetail = PublicCause & {
  story: string;
  faqText: string;
  needs: { id: string; title: string; ageGroup: string; targetPriceCents: number; status: NeedStatus }[];
  giftStatus: Record<"PAID" | "BOUGHT" | "DELIVERED", number>;
  feed: PublicFeedEntry[];
};

export async function getCause(slug: string): Promise<PublicCauseDetail | null> {
  const c = await db.charity.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      region: true,
      photoUrl: true,
      verifiedDemo: true,
      goalCents: true,
      story: true,
      faqText: true,
      needs: {
        orderBy: { targetPriceCents: "asc" },
        select: { id: true, title: true, ageGroup: true, targetPriceCents: true, status: true },
      },
    },
  });
  if (!c) return null;

  const [raised, items, recent] = await Promise.all([
    db.order.aggregate({ _sum: { totalCents: true }, where: { charityId: c.id, ...COUNTED_WHERE } }),
    db.orderItem.findMany({
      where: { order: { charityId: c.id, ...COUNTED_WHERE } },
      select: { status: true },
    }),
    db.order.findMany({
      where: { charityId: c.id, ...COUNTED_WHERE },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        createdAt: true,
        type: true,
        totalCents: true,
        status: true,
        donor: { select: { displayName: true, anonymous: true } },
        items: { select: { status: true }, take: 1 },
      },
    }),
  ]);

  const giftStatus = { PAID: 0, BOUGHT: 0, DELIVERED: 0 };
  for (const i of items) {
    if (i.status === "PAID" || i.status === "BOUGHT" || i.status === "DELIVERED") giftStatus[i.status]++;
  }

  const feed: PublicFeedEntry[] = recent.map((o) => ({
    date: o.createdAt.toISOString(),
    displayName: !o.donor ? "Guest" : o.donor.anonymous ? "Anonymous" : o.donor.displayName,
    type: o.type,
    amountCents: o.totalCents,
    status: o.type === OrderType.CASH ? o.status : (o.items[0]?.status ?? o.status),
  }));

  return {
    slug: c.slug,
    name: c.name,
    category: c.category,
    region: c.region,
    photoUrl: c.photoUrl,
    verifiedDemo: c.verifiedDemo,
    goalCents: c.goalCents,
    raisedCents: raised._sum.totalCents ?? 0,
    openNeeds: c.needs.filter((n) => n.status === NeedStatus.OPEN).length,
    story: c.story,
    faqText: c.faqText,
    needs: c.needs,
    giftStatus,
    feed,
  };
}
