// Demo seed data for Giftly. Used by `npm run db:seed` and the admin reset route.
// Everything here is fictional demo data. No real people, no children's personal data.
import {
  ItemStatus,
  MessageType,
  NeedStatus,
  OrderStatus,
  OrderType,
  type PrismaClient,
} from "@prisma/client";

// Small deterministic random generator so every reset produces the same demo.
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SeedNeed = { title: string; ageGroup: string; priceCents: number; merchant: string };
type SeedCharity = {
  slug: string;
  name: string;
  category: string;
  region: string;
  goalCents: number;
  story: string;
  faqText: string;
  needs: SeedNeed[];
};

const CHARITIES: SeedCharity[] = [
  {
    slug: "bright-pages",
    name: "Bright Pages Reading Fund",
    category: "Education",
    region: "Southern India",
    goalCents: 600000,
    story:
      "Bright Pages runs after-school reading corners in community centres. Many of the children we work with have never owned a book of their own. This season we want every child in our programme to take home a book and school supplies they can keep.",
    faqText:
      "Q: Who do you serve? A: Children aged 3 to 14 attending our after-school reading corners.\n" +
      "Q: How are gifts delivered? A: Our volunteers hand gifts out at the reading corners during the December celebration week.\n" +
      "Q: What does cash pay for? A: Cash covers volunteer travel, reading-corner rent, and shelves.\n" +
      "Q: How many children do you reach? A: About 400 children across 8 reading corners.",
    needs: [
      { title: "Picture storybook set", ageGroup: "3-5", priceCents: 1499, merchant: "Demo Books Co." },
      { title: "Early reader book bundle", ageGroup: "6-8", priceCents: 1899, merchant: "Demo Books Co." },
      { title: "Children's illustrated dictionary", ageGroup: "9-12", priceCents: 1599, merchant: "Demo Books Co." },
      { title: "School backpack with supplies", ageGroup: "6-8", priceCents: 2499, merchant: "Demo Supply Store" },
      { title: "Colouring and crayon kit", ageGroup: "3-5", priceCents: 999, merchant: "Demo Supply Store" },
      { title: "Beginner science experiment kit", ageGroup: "9-12", priceCents: 2999, merchant: "Demo Toy Shop" },
    ],
  },
  {
    slug: "warm-hands",
    name: "Warm Hands Winter Drive",
    category: "Winter warmth",
    region: "Midwest, USA",
    goalCents: 800000,
    story:
      "Every winter, families in our neighbourhoods face freezing temperatures without enough warm clothing. Warm Hands works with local schools to make sure kids have coats, boots, hats and blankets before the coldest months arrive.",
    faqText:
      "Q: How do you find the children who need help? A: School counsellors refer families to us confidentially.\n" +
      "Q: How are gifts delivered? A: Items are handed out at partner schools in early December.\n" +
      "Q: What does cash pay for? A: Cash buys coats in bulk at discount and covers storage.\n" +
      "Q: What sizes do you need most? A: Children's sizes 6 to 12 run out first.",
    needs: [
      { title: "Kids' insulated winter coat", ageGroup: "6-8", priceCents: 3999, merchant: "Demo Outdoor Store" },
      { title: "Kids' waterproof snow boots", ageGroup: "9-12", priceCents: 3499, merchant: "Demo Outdoor Store" },
      { title: "Knit hat and gloves set", ageGroup: "3-5", priceCents: 1299, merchant: "Demo Outdoor Store" },
      { title: "Fleece blanket", ageGroup: "3-5", priceCents: 1999, merchant: "Demo Home Goods" },
      { title: "Thermal base layer set", ageGroup: "13-17", priceCents: 2499, merchant: "Demo Outdoor Store" },
    ],
  },
  {
    slug: "full-plates",
    name: "Full Plates Kids Kitchen",
    category: "Food",
    region: "East Africa",
    goalCents: 500000,
    story:
      "Full Plates serves hot meals to children at community kitchens during school holidays, when school meals stop. This season we are also giving each child a lunchbox and water bottle so they can carry food home.",
    faqText:
      "Q: How many meals do you serve? A: Around 1,200 meals a week during school holidays.\n" +
      "Q: What does $10 buy? A: Roughly 10 hot meals.\n" +
      "Q: How are gifts delivered? A: Kitchen staff hand out gifts at the holiday meal days.\n" +
      "Q: Do you accept food items? A: We prefer cash for food, so we can buy fresh and local.",
    needs: [
      { title: "Insulated kids' lunchbox", ageGroup: "6-8", priceCents: 1499, merchant: "Demo Home Goods" },
      { title: "Reusable kids' water bottle", ageGroup: "3-5", priceCents: 899, merchant: "Demo Home Goods" },
      { title: "Kids' cooking activity set", ageGroup: "9-12", priceCents: 2199, merchant: "Demo Toy Shop" },
      { title: "Healthy snack box", ageGroup: "6-8", priceCents: 1999, merchant: "Demo Grocery" },
      { title: "Lunchbox and bottle bundle", ageGroup: "9-12", priceCents: 2299, merchant: "Demo Home Goods" },
      { title: "Teen reusable meal-prep container set", ageGroup: "13-17", priceCents: 1799, merchant: "Demo Home Goods" },
    ],
  },
];

const DONOR_NAMES = [
  "Priya S.", "Daniel M.", "Aisha K.", "Tom W.", "Mei L.", "Carlos R.", "Fatima Z.", "Ben O.",
  "Sofia G.", "Arjun P.", "Grace H.", "Omar A.", "Lena V.", "Noah B.", "Hana T.", "Ravi N.",
  "Emily C.", "Kwame D.", "Julia F.", "Sam J.", "Nadia E.", "Leo Q.", "Ava P.", "Yusuf I.",
];

const CASH_AMOUNTS = [1000, 1500, 2000, 2500, 2500, 5000, 5000, 7500, 10000, 15000];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function resetAndSeed(db: PrismaClient) {
  const rand = makeRandom(20261112);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  // Wipe in dependency order.
  await db.proof.deleteMany();
  await db.message.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.donor.deleteMany();
  await db.need.deleteMany();
  await db.charity.deleteMany();
  await db.agentLog.deleteMany();

  // Charities and needs.
  const charities = [];
  for (const c of CHARITIES) {
    const created = await db.charity.create({
      data: {
        slug: c.slug,
        name: c.name,
        story: c.story,
        region: c.region,
        category: c.category,
        faqText: c.faqText,
        photoUrl: `https://picsum.photos/seed/giftly-${c.slug}/800/500`,
        verifiedDemo: true,
        goalCents: c.goalCents,
        needs: {
          create: c.needs.map((n) => ({
            title: n.title,
            ageGroup: n.ageGroup,
            targetPriceCents: n.priceCents,
          })),
        },
      },
      include: { needs: true },
    });
    charities.push({ ...created, seed: c });
  }

  // Donors (fake). About 1 in 5 is anonymous.
  const donors = [];
  for (let i = 0; i < DONOR_NAMES.length; i++) {
    donors.push(
      await db.donor.create({
        data: {
          displayName: DONOR_NAMES[i],
          email: `donor${i + 1}@example.com`,
          anonymous: rand() < 0.2,
        },
      })
    );
  }

  // Donations over the last 6 weeks, weighted toward recent days (holiday rise).
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const ORDER_COUNT = 84;
  let ordersCreated = 0;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const daysAgo = Math.floor(42 * (1 - Math.sqrt(rand())));
    const createdAt = new Date(now - daysAgo * DAY - Math.floor(rand() * DAY * 0.9));
    const charity = pick(charities);
    const donor = rand() < 0.1 ? null : pick(donors); // a few guest checkouts
    const r = rand();
    const type: OrderType = r < 0.45 ? OrderType.CASH : r < 0.85 ? OrderType.GIFT : OrderType.HYBRID;

    // Gift item status depends on how old the order is.
    let itemStatus: ItemStatus;
    const s = rand();
    if (daysAgo > 21) itemStatus = s < 0.85 ? ItemStatus.DELIVERED : ItemStatus.BOUGHT;
    else if (daysAgo > 9) itemStatus = s < 0.45 ? ItemStatus.DELIVERED : s < 0.85 ? ItemStatus.BOUGHT : ItemStatus.PAID;
    else itemStatus = s < 0.1 ? ItemStatus.DELIVERED : s < 0.45 ? ItemStatus.BOUGHT : ItemStatus.PAID;

    const cashCents = type === OrderType.GIFT ? 0 : type === OrderType.HYBRID ? pick([500, 1000, 1500, 2000]) : pick(CASH_AMOUNTS);

    let item: {
      needId: string;
      productTitle: string;
      merchant: string;
      productUrl: string;
      imageUrl: string;
      priceAtRecommendationCents: number;
      priceAtPaymentCents: number;
      ageRange: string;
      status: ItemStatus;
    } | null = null;
    let giftCents = 0;
    if (type !== OrderType.CASH) {
      const need = pick(charity.needs);
      const seedNeed = charity.seed.needs.find((n) => n.title === need.title)!;
      giftCents = need.targetPriceCents;
      item = {
        needId: need.id,
        productTitle: need.title,
        merchant: seedNeed.merchant,
        productUrl: `https://example.com/demo-products/${slugify(need.title)}`,
        imageUrl: `https://picsum.photos/seed/giftly-${slugify(need.title)}/400/400`,
        priceAtRecommendationCents: giftCents,
        priceAtPaymentCents: giftCents,
        ageRange: need.ageGroup,
        status: itemStatus,
      };
    }

    const order = await db.order.create({
      data: {
        donorId: donor?.id ?? null,
        charityId: charity.id,
        type,
        totalCents: giftCents + cashCents,
        cashCents,
        paypalOrderId: `SEED-${String(i + 1).padStart(4, "0")}-${Math.floor(rand() * 1e8)}`,
        status: type === OrderType.CASH ? OrderStatus.RECEIVED : OrderStatus.PAID,
        createdAt,
        items: item
          ? {
              create: [{ ...item, createdAt }],
            }
          : undefined,
      },
    });
    ordersCreated++;

    if (item && itemStatus === ItemStatus.DELIVERED) {
      await db.message.create({
        data: {
          orderId: order.id,
          type: MessageType.THANK_YOU,
          text: `Your gift "${item.productTitle}" has been delivered by ${charity.name}. Thank you for making this season brighter for a child.`,
          createdAt: new Date(createdAt.getTime() + 5 * DAY),
        },
      });
    }
  }

  // Mark a couple of needs as funded / fulfilled so the needs list looks alive.
  for (const c of charities) {
    if (c.needs[0]) await db.need.update({ where: { id: c.needs[0].id }, data: { status: NeedStatus.FULFILLED } });
    if (c.needs[1]) await db.need.update({ where: { id: c.needs[1].id }, data: { status: NeedStatus.FUNDED } });
  }

  return {
    charities: charities.length,
    needs: charities.reduce((n, c) => n + c.needs.length, 0),
    donors: donors.length,
    orders: ordersCreated,
  };
}
