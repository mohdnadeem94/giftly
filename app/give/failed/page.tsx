import Link from "next/link";

export default async function FailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; cause?: string }>;
}) {
  const { reason, cause } = await searchParams;
  const safeReason = (reason ?? "").slice(0, 200);
  const backHref = cause && /^[a-z0-9-]+$/.test(cause) ? `/give/${cause}` : "/causes";

  return (
    <section className="card narrow center">
      <div className="big-emoji" aria-hidden="true">
        ⚠️
      </div>
      <h1>Payment not completed</h1>
      <p>{safeReason || "PayPal did not confirm the payment."}</p>
      <p className="muted small">No donation was recorded.</p>
      <div className="actions center">
        <Link href={backHref} className="btn btn-primary">
          Try again
        </Link>
      </div>
    </section>
  );
}
