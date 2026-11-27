/** Placeholder shapes shown while server data streams in. */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 sm:gap-4 sm:p-4" aria-hidden>
      <div className="skeleton size-9 shrink-0 rounded-xl" />
      <div className="skeleton size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
      </div>
      <div className="hidden space-y-2 sm:block">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton ml-auto h-3 w-10" />
      </div>
    </div>
  );
}

export function BoardSkeleton({ rows = 8, withHeader = true }: { rows?: number; withHeader?: boolean }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6" role="status" aria-label="Loading">
      {withHeader && (
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="skeleton h-8 w-64 max-w-full" />
          <div className="skeleton mt-3 h-4 w-96 max-w-full" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="skeleton h-11" />
            <div className="skeleton h-11 sm:col-span-2" />
            <div className="skeleton h-11" />
          </div>
        </div>
      )}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2.5">
          <div className="skeleton mb-4 h-9 w-72 max-w-full rounded-xl" />
          {Array.from({ length: rows }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6" role="status" aria-label="Loading">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-3 h-9 w-80 max-w-full" />
      <div className="skeleton mt-3 h-4 w-full max-w-xl" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
