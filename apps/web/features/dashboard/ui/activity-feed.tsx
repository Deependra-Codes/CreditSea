import { StatusPill } from "@/components/pill";
import type { OverviewResponse } from "@lms/contracts";

const ago = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
};

/** Reads straight off statusHistory — the same audit trail the borrower sees. */
export function ActivityFeed({ events }: { events: OverviewResponse["activity"] }) {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-canvas p-5 ring-1 ring-line">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold">Recent activity</h2>
        <p className="text-xs text-ink-3">Every movement, across every module.</p>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-xs text-ink-3">Nothing has moved yet.</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => (
            <li
              key={`${event.loanId}-${event.at}`}
              className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2.5 ${
                index > 0 ? "border-t border-line-soft" : ""
              }`}
            >
              <StatusPill status={event.to} />
              <span className="text-xs font-semibold">{event.applicantName}</span>
              <span className="text-xs text-ink-3">by {event.byRole.toLowerCase()}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-3">{ago(event.at)}</span>
              {event.reason && (
                <p className="w-full text-xs text-ink-3">&ldquo;{event.reason}&rdquo;</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
