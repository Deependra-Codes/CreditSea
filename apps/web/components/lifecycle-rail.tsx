import type { LoanStatus } from "@lms/domain";

const STAGES = [
  { status: "APPLIED", label: "Applied", dot: "bg-stage-1" },
  { status: "SANCTIONED", label: "Sanctioned", dot: "bg-stage-2" },
  { status: "DISBURSED", label: "Disbursed", dot: "bg-stage-3" },
  { status: "CLOSED", label: "Closed", dot: "bg-stage-4" },
] as const;

export function LifecycleRail({ status }: { status: LoanStatus }) {
  // Handled first: rejection is not a stage on this rail, and rendering it as
  // "stuck at Applied" would misdescribe what happened.
  if (status === "REJECTED") {
    return (
      <p className="text-sm text-critical">
        This application was rejected and did not enter the lifecycle.
      </p>
    );
  }

  const reached = STAGES.findIndex((stage) => stage.status === status);

  return (
    <ol className="flex items-center overflow-x-auto pb-1" aria-label="Loan lifecycle">
      {STAGES.map((stage, index) => (
        <li key={stage.status} className="contents">
          {index > 0 && (
            <span
              className={`h-0.5 min-w-3 flex-auto ${index <= reached ? "bg-stage-2" : "bg-line-2"}`}
              aria-hidden="true"
            />
          )}
          <div className="flex w-24 shrink-0 flex-col items-center gap-1.5">
            <span
              className={[
                "size-3 rounded-full",
                index <= reached ? stage.dot : "border-2 border-line-2 bg-canvas",
                index === reached ? "ring-4 ring-accent/20" : "",
              ].join(" ")}
            />
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                index <= reached ? "text-ink" : "text-ink-3"
              }`}
            >
              {stage.label}
            </span>
            {index === reached && <span className="sr-only">current stage</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
