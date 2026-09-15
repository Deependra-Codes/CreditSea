import type { Role } from "../rbac/roles";

export const LOAN_STATUSES = ["APPLIED", "SANCTIONED", "DISBURSED", "CLOSED", "REJECTED"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

/** A loan is a borrower's open obligation while in one of these. */
export const ACTIVE_LOAN_STATUSES = ["APPLIED", "SANCTIONED", "DISBURSED"] as const;

/**
 * The whole lifecycle and its permissions in one table. `satisfies` keeps it
 * exhaustive: a new status without a row here is a compile error.
 */
export const TRANSITIONS = {
  APPLIED: { SANCTIONED: "SANCTION", REJECTED: "SANCTION" },
  SANCTIONED: { DISBURSED: "DISBURSEMENT" },
  DISBURSED: { CLOSED: "COLLECTION" },
  CLOSED: {},
  REJECTED: {},
} as const satisfies Record<LoanStatus, Partial<Record<LoanStatus, Role>>>;

/** The status each executive module works on. Non-partial so a row cannot be dropped. */
export const QUEUE_STATUS = {
  SANCTION: "APPLIED",
  DISBURSEMENT: "SANCTIONED",
  COLLECTION: "DISBURSED",
} as const satisfies Record<"SANCTION" | "DISBURSEMENT" | "COLLECTION", LoanStatus>;

/** Timestamp field stamped when a loan enters each status. */
export const STATUS_TIMESTAMP = {
  APPLIED: "appliedAt",
  SANCTIONED: "sanctionedAt",
  DISBURSED: "disbursedAt",
  CLOSED: "closedAt",
  REJECTED: "rejectedAt",
} as const satisfies Record<LoanStatus, string>;

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: "INVALID_TRANSITION" | "FORBIDDEN_ROLE" };

export function allowedTransitions(from: LoanStatus): LoanStatus[] {
  return Object.keys(TRANSITIONS[from]) as LoanStatus[];
}

/** ADMIN widens who may act, never what is legal. */
export function checkTransition(from: LoanStatus, to: LoanStatus, role: Role): TransitionCheck {
  const outgoing: Partial<Record<LoanStatus, Role>> = TRANSITIONS[from];
  const owner = outgoing[to];
  if (owner === undefined) return { ok: false, reason: "INVALID_TRANSITION" };
  if (role !== owner && role !== "ADMIN") return { ok: false, reason: "FORBIDDEN_ROLE" };
  return { ok: true };
}
