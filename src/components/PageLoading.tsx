/** Placeholder shown while a page that depends on the URL streams in. */
export function PageLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface/80" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface/70" />
    </div>
  );
}
