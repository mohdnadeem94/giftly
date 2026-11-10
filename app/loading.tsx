// Shown automatically by Next.js while any page is loading its data.
export default function Loading() {
  return (
    <div className="loading-page" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Wrapping up your page…</p>
      <div className="skeleton-grid" aria-hidden="true">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton skeleton-wide" aria-hidden="true" />
    </div>
  );
}
