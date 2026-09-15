import { describe, expect, it } from "vitest";
import { allowedTransitions, checkTransition } from "./transitions";

describe("checkTransition", () => {
  it("allows each legal transition for its owning role", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "SANCTION")).toEqual({ ok: true });
    expect(checkTransition("APPLIED", "REJECTED", "SANCTION")).toEqual({ ok: true });
    expect(checkTransition("SANCTIONED", "DISBURSED", "DISBURSEMENT")).toEqual({ ok: true });
    expect(checkTransition("DISBURSED", "CLOSED", "COLLECTION")).toEqual({ ok: true });
  });

  it("allows ADMIN on every legal transition", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "ADMIN")).toEqual({ ok: true });
    expect(checkTransition("SANCTIONED", "DISBURSED", "ADMIN")).toEqual({ ok: true });
    expect(checkTransition("DISBURSED", "CLOSED", "ADMIN")).toEqual({ ok: true });
  });

  it("refuses a legal transition driven by the wrong role", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "DISBURSEMENT")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
    expect(checkTransition("SANCTIONED", "DISBURSED", "SANCTION")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
  });

  // ADMIN widens who may act, never what is legal.
  it("refuses skipping a stage even for ADMIN", () => {
    expect(checkTransition("APPLIED", "DISBURSED", "ADMIN")).toEqual({
      ok: false,
      reason: "INVALID_TRANSITION",
    });
    expect(checkTransition("APPLIED", "CLOSED", "ADMIN")).toEqual({
      ok: false,
      reason: "INVALID_TRANSITION",
    });
  });

  it("refuses moving out of a terminal status", () => {
    expect(checkTransition("CLOSED", "DISBURSED", "ADMIN").ok).toBe(false);
    expect(checkTransition("REJECTED", "APPLIED", "ADMIN").ok).toBe(false);
  });

  it("refuses any transition driven by a BORROWER", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "BORROWER")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
  });
});

describe("allowedTransitions", () => {
  it("reports the outgoing edges of each status", () => {
    expect(allowedTransitions("APPLIED").sort()).toEqual(["REJECTED", "SANCTIONED"]);
    expect(allowedTransitions("SANCTIONED")).toEqual(["DISBURSED"]);
    expect(allowedTransitions("CLOSED")).toEqual([]);
  });
});
