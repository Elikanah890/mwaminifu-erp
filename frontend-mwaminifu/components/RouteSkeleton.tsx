export default function RouteSkeleton() {
  return (
    <div className="brand-container min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading page">
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mb-2 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-7 h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="surface-card h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
