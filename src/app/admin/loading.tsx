export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}
