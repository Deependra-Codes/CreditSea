import { LifecycleRail } from "@/components/lifecycle-rail";
import { Money } from "@/components/money";
import { StatusPill } from "@/components/pill";
import { serverApi } from "@/lib/server-api";
import type { LoanResponse } from "@lms/contracts";
import { rupeesToPaise } from "@lms/domain";
import Link from "next/link";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export async function StatusPage() {
  const data = await serverApi<{ loans: LoanResponse[] }>("/api/loans/me");
  const loans = data?.loans ?? [];
  const loan = loans[0];

  if (!loan) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-bold tracking-tight">No application yet</h1>
        <p className="text-sm text-ink-2">You have not applied for a loan.</p>
        <Link href="/apply" className="text-sm font-semibold text-accent hover:underline">
          Start an application
        </Link>
      </div>
    );
  }

  // The reason lives in the final history entry, not on the loan — one fact,
  // one home, so the two can never disagree.
  const rejection = [...loan.statusHistory].reverse().find((event) => event.to === "REJECTED");

  return (
    <div className="flex flex-col gap-7">
      <div className="enter flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Your loan</h1>
        <StatusPill status={loan.status} />
      </div>

      <div
        className="enter rounded-card bg-canvas p-5 ring-1 ring-line"
        style={{ animationDelay: "60ms" }}
      >
        <LifecycleRail status={loan.status} />
      </div>

      {rejection?.reason && (
        <div className="rounded-card border border-critical/30 bg-critical/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-critical">
            Reason for rejection
          </p>
          <p className="mt-1 text-sm text-ink">{rejection.reason}</p>
        </div>
      )}

      <div
        className="enter rounded-card bg-canvas px-5 py-1 ring-1 ring-line"
        style={{ animationDelay: "120ms" }}
      >
        <Row label="Principal">
          <Money paise={rupeesToPaise(loan.principal)} />
        </Row>
        <Row label="Tenure">{loan.tenureDays} days</Row>
        <Row label="Interest rate">{loan.interestRatePercent}% p.a.</Row>
        <Row label="Interest">
          <Money paise={rupeesToPaise(loan.interest)} />
        </Row>
        <Row label="Total repayable">
          <Money paise={rupeesToPaise(loan.totalRepayable)} />
        </Row>
        <Row label="Outstanding">
          <Money paise={rupeesToPaise(loan.outstanding)} />
        </Row>
        <Row label="Applied">{date(loan.appliedAt)}</Row>
      </div>

      {loan.statusHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.09em] text-ink-3">History</h2>
          <ol className="flex flex-col gap-1.5">
            {loan.statusHistory.map((event) => (
              <li
                key={`${event.at}-${event.to}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-ctrl border border-line bg-canvas px-3 py-2 text-sm"
              >
                <StatusPill status={event.to} />
                <span className="text-ink-2">by {event.byRole.toLowerCase()}</span>
                <span className="ml-auto font-mono text-xs text-ink-3">{date(event.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
