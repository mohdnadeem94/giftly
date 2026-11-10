import Link from "next/link";
import { notFound } from "next/navigation";
import ProgressBar from "@/components/ProgressBar";
import { getCause } from "@/lib/public-data";
import { label, money, shortDate } from "@/lib/format";

export default async function CausePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cause = await getCause(slug);
  if (!cause) notFound();

  const faq = cause.faqText.split("\n").filter(Boolean);

  return (
    <>
      <Link href="/causes" className="muted back">
        ← All causes
      </Link>

      <section className="cause-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cause.photoUrl} alt="" className="cause-photo" />
        <div>
          <h1>
            {cause.name}
            {cause.verifiedDemo && <span className="chip chip-verified">Verified (demo)</span>}
          </h1>
          <p className="muted">
            {cause.category} · {cause.region}
          </p>
          <ProgressBar raisedCents={cause.raisedCents} goalCents={cause.goalCents} />
          <div className="actions">
            <Link href={`/give/${cause.slug}?mode=cash`} className="btn btn-primary">
              Give cash
            </Link>
            <Link href={`/give/${cause.slug}?mode=gift`} className="btn btn-green">
              Give a gift
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Their story</h2>
        <p>{cause.story}</p>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>What they need</h2>
          <ul className="needs">
            {cause.needs.map((n) => (
              <li key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="muted small">Ages {n.ageGroup}</div>
                </div>
                <div className="needs-right">
                  <span>{money(n.targetPriceCents)}</span>
                  <span className={`chip chip-${n.status.toLowerCase()}`}>{label(n.status)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Gift journey</h2>
          <div className="status-row">
            <div className="status-box">
              <span className="chip chip-paid">Paid</span>
              <strong>{cause.giftStatus.PAID}</strong>
            </div>
            <div className="status-box">
              <span className="chip chip-bought">Bought</span>
              <strong>{cause.giftStatus.BOUGHT}</strong>
            </div>
            <div className="status-box">
              <span className="chip chip-delivered">Delivered</span>
              <strong>{cause.giftStatus.DELIVERED}</strong>
            </div>
          </div>
          <h3>Questions</h3>
          <ul className="faq">
            {faq.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>Recent donations</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Donor</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cause.feed.map((f, i) => (
                <tr key={i}>
                  <td>{shortDate(f.date)}</td>
                  <td>{f.displayName}</td>
                  <td>{label(f.type)}</td>
                  <td>{money(f.amountCents)}</td>
                  <td>
                    <span className={`chip chip-${f.status.toLowerCase()}`}>{label(f.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
