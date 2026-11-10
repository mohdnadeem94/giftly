import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { label, money } from "@/lib/format";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (!ref) notFound();

  // Safe fields only: no PayPal order ID, no email.
  const order = await db.order.findUnique({
    where: { id: ref },
    select: {
      type: true,
      totalCents: true,
      status: true,
      charity: { select: { name: true, slug: true } },
      items: { select: { productTitle: true, status: true } },
    },
  });
  if (!order) notFound();

  const item = order.items[0];

  return (
    <section className="card narrow center">
      <div className="big-emoji" aria-hidden="true">
        🎉
      </div>
      <h1>Thank you!</h1>
      <p>
        Your {order.type === "CASH" ? "donation" : "gift"} of <strong>{money(order.totalCents)}</strong> to{" "}
        <strong>{order.charity.name}</strong> was confirmed by PayPal.
      </p>
      {item ? (
        <p>
          <strong>{item.productTitle}</strong> <span className="chip chip-paid">{label(item.status)}</span>
          <br />
          <span className="muted small">
            Next, the charity buys it and uploads a receipt. Then it&apos;s marked Delivered.
          </span>
        </p>
      ) : (
        <p>
          <span className="chip chip-received">{label(order.status)}</span>
        </p>
      )}
      <div className="actions center">
        <Link href={`/causes/${order.charity.slug}`} className="btn">
          Back to cause
        </Link>
        <Link href="/causes" className="btn btn-primary">
          Give again
        </Link>
      </div>
      <p className="muted small">PayPal sandbox payment. No real money moved.</p>
    </section>
  );
}
