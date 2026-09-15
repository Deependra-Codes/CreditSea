import { describe, expect, it } from "vitest";
import { type LeadFacts, leadStage } from "./stage";

const facts = (over: Partial<LeadFacts> = {}): LeadFacts => ({
  hasProfile: false,
  breEvaluated: false,
  brePassed: false,
  hasLoan: false,
  ...over,
});

describe("leadStage", () => {
  it("starts a fresh registration at SIGNED_UP", () => {
    expect(leadStage(facts())).toBe("SIGNED_UP");
  });

  it("reports DETAILS_STARTED once a profile exists but no check has run", () => {
    expect(leadStage(facts({ hasProfile: true }))).toBe("DETAILS_STARTED");
  });

  it("separates a failed check from a passed one", () => {
    expect(leadStage(facts({ hasProfile: true, breEvaluated: true }))).toBe("NOT_ELIGIBLE");
    expect(leadStage(facts({ hasProfile: true, breEvaluated: true, brePassed: true }))).toBe(
      "READY_TO_APPLY",
    );
  });

  // A funnel that drops its conversions shows Sales only what has not worked.
  it("keeps a converted lead on the list as APPLIED", () => {
    expect(
      leadStage(facts({ hasProfile: true, breEvaluated: true, brePassed: true, hasLoan: true })),
    ).toBe("APPLIED");
  });

  it("reports APPLIED even for a lead whose earlier check failed", () => {
    expect(leadStage(facts({ hasProfile: true, breEvaluated: true, hasLoan: true }))).toBe(
      "APPLIED",
    );
  });
});
