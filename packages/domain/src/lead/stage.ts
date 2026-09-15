export const LEAD_STAGES = [
  "SIGNED_UP",
  "DETAILS_STARTED",
  "NOT_ELIGIBLE",
  "READY_TO_APPLY",
  "APPLIED",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export type LeadFacts = {
  hasProfile: boolean;
  breEvaluated: boolean;
  brePassed: boolean;
  hasLoan: boolean;
};

/**
 * Where a registered borrower sits in the pre-application funnel. Pure, so the
 * Sales queue and its tests share one definition of each stage.
 *
 * Applied leads stay on the list rather than vanishing: a funnel that drops its
 * conversions shows Sales only what has not worked.
 */
export function leadStage(facts: LeadFacts): LeadStage {
  if (facts.hasLoan) return "APPLIED";
  if (!facts.hasProfile) return "SIGNED_UP";
  if (!facts.breEvaluated) return "DETAILS_STARTED";
  return facts.brePassed ? "READY_TO_APPLY" : "NOT_ELIGIBLE";
}
