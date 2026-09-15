import { Money } from "@/components/money";
import type { Column, Tile } from "@/components/queue-shell";
import type { LoanResponse } from "@lms/contracts";
import { rupeesToPaise } from "@lms/domain";

const since = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
};

/** Shared by the three loan queues; each adds the column its own work needs. */
export const loanColumns: Column<LoanResponse>[] = [
  { key: "name", header: "Applicant", render: (loan) => loan.applicantName },
  {
    key: "pan",
    header: "PAN",
    secondary: true,
    render: (loan) => <span className="font-mono">{loan.pan}</span>,
  },
  {
    key: "principal",
    header: "Principal",
    align: "right",
    render: (loan) => <Money paise={rupeesToPaise(loan.principal)} />,
  },
  {
    key: "tenure",
    header: "Tenure",
    align: "right",
    secondary: true,
    render: (loan) => `${loan.tenureDays} d`,
  },
  {
    key: "repayable",
    header: "Repayable",
    align: "right",
    render: (loan) => <Money paise={rupeesToPaise(loan.totalRepayable)} />,
  },
];

export const waitingTiles = (
  loans: LoanResponse[],
  stamp: (loan: LoanResponse) => string,
): Tile[] => {
  const value = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const oldest = loans.length > 0 ? since(stamp(loans[0] as LoanResponse)) : "—";

  return [
    { label: "In queue", value: String(loans.length) },
    { label: "Oldest wait", value: oldest },
    { label: "Value queued", value: `₹${(value / 100_000).toFixed(1)}L` },
  ];
};
