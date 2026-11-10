"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card narrow">
      <h1>Something went wrong</h1>
      <p className="muted">We couldn&apos;t load this page. The database may be waking up; please try again.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
