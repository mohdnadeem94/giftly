import Link from "next/link";
import { notFound } from "next/navigation";
import { NeedStatus } from "@prisma/client";
import Checkout from "@/components/Checkout";
import { db } from "@/lib/db";

export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const charity = await db.charity.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      needs: {
        where: { status: { not: NeedStatus.FULFILLED } },
        orderBy: { targetPriceCents: "asc" },
        select: { id: true, title: true, ageGroup: true, targetPriceCents: true },
      },
    },
  });
  if (!charity) notFound();

  const isGift = mode === "gift";

  return (
    <section className="card narrow">
      <Link href={`/causes/${charity.slug}`} className="muted back">
        ← Back to cause
      </Link>
      <div className="mode-tabs">
        <Link href={`/give/${charity.slug}?mode=cash`} className={!isGift ? "mode-tab active" : "mode-tab"}>
          Give cash
        </Link>
        <Link href={`/give/${charity.slug}?mode=gift`} className={isGift ? "mode-tab active" : "mode-tab"}>
          Give a gift
        </Link>
      </div>
      <h1>{isGift ? "Give a gift" : "Give cash"}</h1>
      <p>
        To <strong>{charity.name}</strong>
      </p>
      <p className="muted small">
        {isGift
          ? "Your payment is tied to this exact item. You can follow it from Paid to Bought to Delivered."
          : "Cash goes to the charity's running costs, where it often does the most good."}
      </p>
      <Checkout
        key={isGift ? "gift" : "cash"}
        charity={{ slug: charity.slug, name: charity.name }}
        mode={isGift ? "gift" : "cash"}
        needs={charity.needs.map((n) => ({
          id: n.id,
          title: n.title,
          ageGroup: n.ageGroup,
          priceCents: n.targetPriceCents,
        }))}
        paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
      />
    </section>
  );
}
