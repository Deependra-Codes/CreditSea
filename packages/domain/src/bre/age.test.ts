import { describe, expect, it } from "vitest";
import { calculateAge } from "./age";

const asOf = new Date("2026-09-15T00:00:00Z");

// Plain year subtraction returns 26 for all four of these.
describe("calculateAge", () => {
  it("counts a birthday that has already passed this year", () => {
    expect(calculateAge(new Date("2000-01-10T00:00:00Z"), asOf)).toBe(26);
  });

  it("does not count a birthday still ahead this year", () => {
    expect(calculateAge(new Date("2000-12-10T00:00:00Z"), asOf)).toBe(25);
  });

  it("counts the birthday itself", () => {
    expect(calculateAge(new Date("2000-09-15T00:00:00Z"), asOf)).toBe(26);
  });

  it("does not count the day before the birthday", () => {
    expect(calculateAge(new Date("2000-09-16T00:00:00Z"), asOf)).toBe(25);
  });
});
