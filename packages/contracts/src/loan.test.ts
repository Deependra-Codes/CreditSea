import { describe, expect, it } from "vitest";
import { createLoanSchema, paymentSchema } from "./loan";

describe("createLoanSchema", () => {
  it("accepts rupees and yields integer paise", () => {
    const parsed = createLoanSchema.parse({ amount: 50_000, tenureDays: 30 });
    expect(parsed.amount).toBe(5_000_000);
    expect(parsed.tenureDays).toBe(30);
  });

  it("rejects amounts outside the principal bounds", () => {
    expect(createLoanSchema.safeParse({ amount: 49_999, tenureDays: 30 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ amount: 500_001, tenureDays: 30 }).success).toBe(false);
  });

  it("rejects tenures outside 30-365 and non-integers", () => {
    expect(createLoanSchema.safeParse({ amount: 50_000, tenureDays: 29 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ amount: 50_000, tenureDays: 366 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ amount: 50_000, tenureDays: 30.5 }).success).toBe(false);
  });
});

describe("paymentSchema", () => {
  it("uppercases the UTR and converts the amount to paise", () => {
    const parsed = paymentSchema.parse({
      utr: " utr12345 ",
      amount: 493.15,
      paidAt: "2026-09-01",
    });
    expect(parsed.utr).toBe("UTR12345");
    expect(parsed.amount).toBe(49_315);
  });

  it("rejects a future payment date", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      paymentSchema.safeParse({ utr: "UTR12345", amount: 100, paidAt: tomorrow }).success,
    ).toBe(false);
  });
});
