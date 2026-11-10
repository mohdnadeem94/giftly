import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { listCauses } from "@/lib/public-data";
import { money } from "@/lib/format";

export default async function CausesPage() {
  const causes = await listCauses();

  return (
    <>
      <h1>Explore causes</h1>
      <p className="muted">Every cause below gives to children. Give cash, or a real gift you can follow to delivery.</p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cause</th>
              <th>Category</th>
              <th>Region</th>
              <th>Goal</th>
              <th>Raised</th>
              <th>Open needs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {causes.map((c) => (
              <tr key={c.slug}>
                <td>
                  <Link href={`/causes/${c.slug}`} className="strong-link">
                    {c.name}
                  </Link>
                  {c.verifiedDemo && <span className="chip chip-verified">Verified (demo)</span>}
                </td>
                <td>{c.category}</td>
                <td>{c.region}</td>
                <td>{money(c.goalCents)}</td>
                <td className="cell-progress">
                  <ProgressBar raisedCents={c.raisedCents} goalCents={c.goalCents} />
                </td>
                <td>{c.openNeeds}</td>
                <td>
                  <Link href={`/causes/${c.slug}`} className="btn btn-primary btn-small">
                    Donate
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
