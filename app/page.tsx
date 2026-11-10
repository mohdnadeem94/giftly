import Link from "next/link";
import { getPublicStats } from "@/lib/public-data";
import { money } from "@/lib/format";

export default async function Home() {
  const stats = await getPublicStats();

  const tiles = [
    { label: "Total raised", value: money(stats.totalRaisedCents) },
    { label: "Gifts delivered", value: `${stats.giftsDelivered} of ${stats.giftsGiven}` },
    { label: "Active causes", value: String(stats.activeCauses) },
    { label: "Donors", value: String(stats.donors) },
  ];

  return (
    <>
      <section className="hero">
        <p className="badge">PayPal AI Hackathon 2026 · Demo prototype</p>
        <h1>
          <span aria-hidden="true">🎁</span> Giftly
        </h1>
        <p className="tagline">
          Follow your gift from click to child.
          <br />
          Your money moves only when the gift arrives.
        </p>
        <Link href="/causes" className="btn btn-primary">
          Explore causes
        </Link>
      </section>

      <section className="tiles" aria-label="Giftly in numbers">
        {tiles.map((t) => (
          <div key={t.label} className="tile">
            <div className="tile-value">{t.value}</div>
            <div className="tile-label">{t.label}</div>
          </div>
        ))}
      </section>

      <section className="card elf">
        <h2>
          <span aria-hidden="true">🧝</span> Ask the Elf
        </h2>
        <p>
          Tell the Elf what you&apos;d like to give, for example &ldquo;a Christmas gift for a 5-year-old girl, around
          $20&rdquo;. It will suggest real gifts with live prices, or the cause where cash does the most good.
        </p>
        <div className="elf-input">
          <input type="text" disabled placeholder="The Elf is getting ready…" aria-label="Message the Elf" />
          <button type="button" className="btn" disabled>
            Ask
          </button>
        </div>
      </section>
    </>
  );
}
