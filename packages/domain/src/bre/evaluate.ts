import type { Paise } from "../money/paise";
import { calculateAge } from "./age";
import { PAN_FORMAT } from "./pan";

export const MIN_AGE = 23;
export const MAX_AGE = 50;
export const MIN_MONTHLY_SALARY_PAISE = 2_500_000 as Paise;

export type EmploymentMode = "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED";
export type BreCode = "AGE" | "SALARY" | "PAN" | "EMPLOYMENT";

export type Applicant = {
  pan: string;
  dateOfBirth: Date;
  monthlySalaryPaise: Paise;
  employmentMode: EmploymentMode;
};

export type BreFailure = { code: BreCode; message: string };
export type BreResult = { passed: boolean; failures: BreFailure[] };

type BreRule = {
  code: BreCode;
  message: string;
  passes: (applicant: Applicant, asOf: Date) => boolean;
};

/** Rules as data: adding one is a list entry, not a new branch. */
export const BRE_RULES: readonly BreRule[] = [
  {
    code: "AGE",
    message: `Age must be between ${MIN_AGE} and ${MAX_AGE} years.`,
    passes: (applicant, asOf) => {
      const age = calculateAge(applicant.dateOfBirth, asOf);
      return age >= MIN_AGE && age <= MAX_AGE;
    },
  },
  {
    code: "SALARY",
    message: "Monthly salary must be at least ₹25,000.",
    passes: (applicant) => applicant.monthlySalaryPaise >= MIN_MONTHLY_SALARY_PAISE,
  },
  {
    code: "PAN",
    message: "PAN must be 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F).",
    passes: (applicant) => PAN_FORMAT.test(applicant.pan),
  },
  {
    code: "EMPLOYMENT",
    message: "Unemployed applicants are not eligible.",
    passes: (applicant) => applicant.employmentMode !== "UNEMPLOYED",
  },
];

/** Reports every failure so the applicant fixes them in one pass, not four. */
export function evaluateBre(applicant: Applicant, asOf: Date = new Date()): BreResult {
  const failures = BRE_RULES.filter((rule) => !rule.passes(applicant, asOf)).map(
    ({ code, message }) => ({ code, message }),
  );
  return { passed: failures.length === 0, failures };
}
