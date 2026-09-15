import type { ApplicationResponse } from "@lms/contracts";

/** Step 1 is authentication — reaching this page means it is done. */
export const STEPS = [
  { number: 1, label: "Account" },
  { number: 2, label: "Your details" },
  { number: 3, label: "Salary slip" },
  { number: 4, label: "Your loan" },
] as const;

export type WizardStep = 2 | 3 | 4;

/**
 * Derived from server state rather than stored, so a reload, a second tab, or a
 * back button can never land the user on a step their data does not support.
 */
export function currentStep(application: ApplicationResponse): WizardStep {
  const { profile } = application;
  if (!profile || !profile.bre.passed) return 2;
  if (!profile.salarySlip) return 3;
  return 4;
}
