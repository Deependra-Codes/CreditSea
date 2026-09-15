import { describe, expect, it } from "vitest";
import { formatPaise, paiseToRupees, rupeesToPaise } from "./paise";

describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(rupeesToPaise(50_000)).toBe(5_000_000);
  });

  it("converts paise-precision amounts without float drift", () => {
    expect(rupeesToPaise(493.15)).toBe(49_315);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30); // 0.30000000000000004
  });

  it("rounds half up at the paise boundary", () => {
    expect(rupeesToPaise(1.005)).toBe(101); // 1.005 * 100 === 100.49999999999999
  });

  it("rounds beyond two decimal places to the nearest paisa", () => {
    expect(rupeesToPaise(1.2345)).toBe(123);
    expect(rupeesToPaise(1.2355)).toBe(124);
  });

  it("handles negative amounts symmetrically", () => {
    expect(rupeesToPaise(-493.15)).toBe(-49_315);
  });

  it("throws on non-finite input", () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(/finite/i);
    expect(() => rupeesToPaise(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });

  it("throws when the result would leave safe integer range", () => {
    expect(() => rupeesToPaise(1e15)).toThrow(/range/i);
  });
});

describe("paiseToRupees", () => {
  it("round-trips", () => {
    expect(paiseToRupees(rupeesToPaise(50_493.15))).toBe(50_493.15);
  });
});

describe("formatPaise", () => {
  it("renders Indian grouping with two decimals", () => {
    expect(formatPaise(rupeesToPaise(50_493.15))).toBe("₹50,493.15");
    expect(formatPaise(rupeesToPaise(500_000))).toBe("₹5,00,000.00");
  });
});
