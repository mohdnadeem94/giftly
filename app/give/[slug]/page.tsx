import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

// Placeholder for the giving flow. PayPal checkout arrives in Step 4, gift search in Step 5.
export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const charity = await db.charity.findUnique({ where: { slug }, select: { name: true, slug: true } });
  if (!charity) notFound();

  const isGift = mode === "gift";

  return (
    <section className="card narrow">
      <h1>{isGift ? "Give a gift" : "Give cash"}</h1>
      <p>
        To <strong>{charity.name}</strong>
      </p>
      <p className="muted">
        {isGift
          ? "Gift search with live prices and PayPal checkout are coming next."
          : "PayPal checkout is coming next."}
      </p>
      <Link href={`/causes/${charity.slug}`} className="btn">
        ← Back to cause
      </Link>
    </section>
  );
}
