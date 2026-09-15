import { LifecycleRail } from "@/components/lifecycle-rail";
import { Money } from "@/components/money";
import type { LoanResponse } from "@lms/contracts";
import { rupeesToPaise } from "@lms/domain";
import type { ReactNode } from "react";

const facts = (loan: LoanResponse) => [
  { label: "Principal", value: <Money paise={rupeesToPaise(loan.principal)} /> },
  { label: "Interest", value: <Money paise={rupeesToPaise(loan.interest)} /> },
  { label: "Total repayable", value: <Money paise={rupeesToPaise(loan.totalRepayable)} /> },
  { label: "Outstanding", value: <Money paise={rupeesToPaise(loan.outstanding)} /> },
  { label: "Tenure", value: `${loan.tenureDays} days` },
  { label: "Rate", value: `${loan.interestRatePercent}% p.a.` },
];

/** The same rail the borrower sees, so both sides read one mental model. */
export function LoanDetail({ loan, children }: { loan: LoanResponse; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <LifecycleRail status={loan.status} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {facts(loan).map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {fact.label}
            </dt>
            <dd className="text-sm font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/files/salary-slip/${loan.borrowerId}`}
        target="_blank"
        rel="noreferrer"
        className="self-start text-sm font-semibold text-accent hover:underline"
      >
        View salary slip
      </a>

      <div className="border-t border-line pt-4">{children}</div>
    </div>
  );
}
