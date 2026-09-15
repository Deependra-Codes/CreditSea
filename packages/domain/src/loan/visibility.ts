import type { Role } from "../rbac/roles";
import { type LoanStatus, QUEUE_STATUS } from "./transitions";

export type LoanViewer = { id: string; role: Role };

/** `actedRoles` is derived from the loan's statusHistory, kept as data so this stays pure. */
export type ViewableLoan = {
  borrowerId: string;
  status: LoanStatus;
  actedRoles: readonly Role[];
};

/**
 * Loans carry PAN, salary and repayment data, so "any executive" is too broad.
 * A viewer qualifies by ownership, by ADMIN, by the loan sitting in their queue,
 * or by having moved it earlier.
 */
export function canViewLoan(viewer: LoanViewer, loan: ViewableLoan): boolean {
  if (viewer.role === "ADMIN") return true;
  if (viewer.id === loan.borrowerId) return true;

  const queued = (QUEUE_STATUS as Partial<Record<Role, LoanStatus>>)[viewer.role];
  if (queued !== undefined && queued === loan.status) return true;

  return loan.actedRoles.includes(viewer.role);
}
