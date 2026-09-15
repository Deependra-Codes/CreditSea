import type { BreFailure, EmploymentMode, LeadStage, LoanStatus, Role } from "@lms/domain";

/**
 * The shapes the API actually sends. Money is in rupees here, matching the
 * inbound direction — paise is internal to each side, and each end converts at
 * its own boundary.
 *
 * These exist so the API cannot quietly widen a response: internal fields such
 * as activeBorrowerId enforce an invariant and are nobody's business outside
 * the database.
 */

export type SalarySlipResponse = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type ProfileResponse = {
  id: string;
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  bre: { passed: boolean; failures: BreFailure[]; evaluatedAt: string };
  salarySlip: SalarySlipResponse | null;
};

export type StatusEventResponse = {
  from: LoanStatus;
  to: LoanStatus;
  byRole: Role;
  at: string;
  reason?: string;
};

export type LoanResponse = {
  id: string;
  borrowerId: string;
  applicantName: string;
  pan: string;
  principal: number;
  tenureDays: number;
  interestRatePercent: number;
  interest: number;
  totalRepayable: number;
  outstanding: number;
  status: LoanStatus;
  statusHistory: StatusEventResponse[];
  appliedAt: string;
  sanctionedAt?: string;
  disbursedAt?: string;
  closedAt?: string;
  rejectedAt?: string;
};

export type PaymentResponse = {
  id: string;
  utr: string;
  amount: number;
  paidAt: string;
};

export type LeadResponse = {
  id: string;
  fullName: string;
  email: string;
  pan: string | null;
  registeredAt: string | null;
  stage: LeadStage;
  hasActiveLoan: boolean;
};

export type ApplicationResponse = {
  profile: ProfileResponse | null;
  activeLoan: LoanResponse | null;
};
