import { money, percent } from "@/lib/format";

export default function ProgressBar({ raisedCents, goalCents }: { raisedCents: number; goalCents: number }) {
  const pct = percent(raisedCents, goalCents);
  return (
    <div className="progress-wrap">
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">
        {money(raisedCents)} of {money(goalCents)} ({pct}%)
      </span>
    </div>
  );
}
