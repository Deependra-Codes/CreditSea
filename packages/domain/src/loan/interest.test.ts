import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "../money/paise";
import { quoteLoan } from "./interest";

describe("quoteLoan", () => {
  it("matches the spec anchor for ₹50,000 over 30 days", () => {
    const quote = quoteLoan(rupeesToPaise(50_000), 30);
    expect(quote.interestPaise).toBe(49_315); // 18,000,000 / 36,500 = 493.1506...
    expect(quote.totalRepayablePaise).toBe(5_049_315);
  });

  it("matches the spec anchor for ₹5,00,000 over 365 days", () => {
    const quote = quoteLoan(rupeesToPaise(500_000), 365);
    expect(quote.interestPaise).toBe(6_000_000); // exactly 12% of 5L
    expect(quote.totalRepayablePaise).toBe(56_000_000);
  });

  it("stays within safe integer range at the maximum", () => {
    const quote = quoteLoan(rupeesToPaise(500_000), 365);
    expect(Number.isSafeInteger(quote.totalRepayablePaise)).toBe(true);
  });

  it("always produces integers", () => {
    for (const days of [30, 31, 97, 200, 364, 365]) {
      const quote = quoteLoan(rupeesToPaise(123_456), days);
      expect(Number.isInteger(quote.interestPaise)).toBe(true);
      expect(Number.isInteger(quote.totalRepayablePaise)).toBe(true);
    }
  });

  it("rejects a principal or tenure outside the allowed bounds", () => {
    expect(() => quoteLoan(rupeesToPaise(49_999), 30)).toThrow(/principal/i);
    expect(() => quoteLoan(rupeesToPaise(500_001), 30)).toThrow(/principal/i);
    expect(() => quoteLoan(rupeesToPaise(50_000), 29)).toThrow(/tenure/i);
    expect(() => quoteLoan(rupeesToPaise(50_000), 366)).toThrow(/tenure/i);
    expect(() => quoteLoan(rupeesToPaise(50_000), 30.5)).toThrow(/tenure/i);
  });
});
