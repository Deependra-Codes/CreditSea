import type { LoanStatus } from "@lms/domain";

// Exhaustive by type: a new status in the domain fails the build here first.
const DOT: Record<LoanStatus, string> = {
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

/** The name is always present — status never rests on colour alone. */
export function StatusPill({ status }: { status: LoanStatus }) {
  const tone = status === "REJECTED" ? "text-critical ring-critical/40" : "text-ink-2 ring-line";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}
    >
      <span className={`size-[7px] shrink-0 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </span>
  );
}
