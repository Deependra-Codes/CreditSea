/**
 * Shown while a queue's data is in flight. A blank screen that then fills reads
 * as broken; a shape that then fills reads as loading.
 */
export function QueueSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder
            key={index}
            className="flex flex-col gap-2 rounded-card bg-canvas px-3.5 py-3 ring-1 ring-line-soft"
          >
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton h-6 w-12" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-card bg-canvas ring-1 ring-line-soft">
        {Array.from({ length: rows }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder
            key={index}
            className="flex items-center gap-4 border-b border-line-soft px-3 py-3.5 last:border-b-0"
          >
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton hidden h-3.5 w-24 sm:block" />
            <div className="skeleton h-4 w-20 rounded-full" />
            <div className="skeleton ml-auto h-3.5 w-20" />
            <div className="skeleton h-3.5 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}
