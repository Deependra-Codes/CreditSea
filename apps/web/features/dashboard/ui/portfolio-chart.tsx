import { Money } from "@/components/money";
import type { OverviewResponse } from "@lms/contracts";
import type { LoanStatus } from "@lms/domain";
import { rupeesToPaise } from "@lms/domain";

const BAR: Record<LoanStatus, string> = {
  APPLIED: "bg-stage-1",
  SANCTIONED: "bg-stage-2",
  DISBURSED: "bg-stage-3",
  CLOSED: "bg-stage-4",
  REJECTED: "bg-critical",
};

const LABEL: Record<LoanStatus, string> = {
  APPLIED: "Applied",
  SANCTIONED: "Sanctioned",
  DISBURSED: "Disbursed",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

/**
 * Magnitude by status, so a bar chart rather than a pie. Every row is labelled
 * with its own count and value, which is why the bars need no axis: the numbers
 * are already beside them.
 */
export function PortfolioChart({ rows }: { rows: OverviewResponse["byStatus"] }) {
  const peak = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className="flex flex-col gap-4 rounded-card bg-canvas p-5 ring-1 ring-line">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold">Portfolio by status</h2>
        <p className="text-xs text-ink-3">Every loan on the book, and what it is worth.</p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li
            key={row.status}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
              <span className={`size-2 shrink-0 rounded-full ${BAR[row.status]}`} />
              {LABEL[row.status]}
            </span>

            <span className="flex h-5 items-center">
              <span
                className={`h-2 rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${BAR[row.status]}`}
                style={{ width: `${Math.max(2, (row.count / peak) * 100)}%` }}
                aria-hidden
              />
            </span>

            <span className="flex items-baseline gap-2 text-xs">
              <span className="font-bold tabular-nums">{row.count}</span>
              <Money paise={rupeesToPaise(row.principal)} className="text-ink-3" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
