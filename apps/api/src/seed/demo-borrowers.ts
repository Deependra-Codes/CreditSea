import type { EmploymentMode } from "@lms/domain";

/** How far each demo borrower has been carried, so every screen has content. */
export type DemoOutcome =
  | "LEAD_ONLY"
  | "NOT_ELIGIBLE"
  | "READY"
  | "APPLIED"
  | "SANCTIONED"
  | "DISBURSED"
  | "PART_PAID"
  | "CLOSED"
  | "REJECTED";

export type DemoBorrower = {
  fullName: string;
  email: string;
  pan: string;
  bornYearsAgo: number;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  outcome: DemoOutcome;
  amount?: number;
  tenureDays?: number;
  rejectionReason?: string;
};

export const DEMO_BORROWERS: readonly DemoBorrower[] = [
  {
    fullName: "Arjun Nair",
    email: "arjun@lms.test",
    pan: "AAJPN1102C",
    bornYearsAgo: 29,
    monthlySalary: 42_000,
    employmentMode: "SALARIED",
    outcome: "LEAD_ONLY",
  },
  {
    fullName: "Meera Joshi",
    email: "meera@lms.test",
    pan: "BBKPJ4417D",
    bornYearsAgo: 19, // too young — shows a live BRE failure in the Sales funnel
    monthlySalary: 18_000,
    employmentMode: "UNEMPLOYED",
    outcome: "NOT_ELIGIBLE",
  },
  {
    fullName: "Rohit Menon",
    email: "rohit@lms.test",
    pan: "BXKPM8821K",
    bornYearsAgo: 34,
    monthlySalary: 55_000,
    employmentMode: "SELF_EMPLOYED",
    outcome: "READY",
  },
  {
    fullName: "Ananya Iyer",
    email: "ananya@lms.test",
    pan: "ABCPE1234F",
    bornYearsAgo: 31,
    monthlySalary: 64_000,
    employmentMode: "SALARIED",
    outcome: "APPLIED",
    amount: 120_000,
    tenureDays: 90,
  },
  {
    fullName: "Fatima Sheikh",
    email: "fatima@lms.test",
    pan: "CQRPS4410M",
    bornYearsAgo: 38,
    monthlySalary: 98_000,
    employmentMode: "SALARIED",
    outcome: "APPLIED",
    amount: 300_000,
    tenureDays: 180,
  },
  {
    fullName: "Vikram Rao",
    email: "vikram@lms.test",
    pan: "DLMPR7734J",
    bornYearsAgo: 44,
    monthlySalary: 150_000,
    employmentMode: "SALARIED",
    outcome: "SANCTIONED",
    amount: 500_000,
    tenureDays: 365,
  },
  {
    fullName: "Priya Deshmukh",
    email: "priya@lms.test",
    pan: "EFGPD9087H",
    bornYearsAgo: 27,
    monthlySalary: 48_000,
    employmentMode: "SALARIED",
    outcome: "PART_PAID",
    amount: 80_000,
    tenureDays: 60,
  },
  {
    fullName: "Sneha Kulkarni",
    email: "sneha@lms.test",
    pan: "EPTPK2093B",
    bornYearsAgo: 36,
    monthlySalary: 72_000,
    employmentMode: "SALARIED",
    outcome: "CLOSED",
    amount: 50_000,
    tenureDays: 30,
  },
  {
    fullName: "Kabir Shah",
    email: "kabir@lms.test",
    pan: "FGHPS5521L",
    bornYearsAgo: 41,
    monthlySalary: 30_000,
    employmentMode: "SELF_EMPLOYED",
    outcome: "REJECTED",
    amount: 450_000,
    tenureDays: 300,
    rejectionReason: "Requested amount is disproportionate to the declared monthly income.",
  },
];
