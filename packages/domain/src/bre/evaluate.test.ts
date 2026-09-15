import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "../money/paise";
import { type Applicant, evaluateBre } from "./evaluate";

const asOf = new Date("2026-09-15T00:00:00Z");
const codes = (a: Applicant) =>
  evaluateBre(a, asOf)
    .failures.map((f) => f.code)
    .sort();

const eligible: Applicant = {
  pan: "ABCDE1234F",
  dateOfBirth: new Date("1995-01-01T00:00:00Z"),
  monthlySalaryPaise: rupeesToPaise(30_000),
  employmentMode: "SALARIED",
};

describe("evaluateBre", () => {
  it("passes a fully eligible applicant", () => {
    expect(evaluateBre(eligible, asOf)).toEqual({ passed: true, failures: [] });
  });

  it("accepts the inclusive age boundaries 23 and 50", () => {
    expect(codes({ ...eligible, dateOfBirth: new Date("2003-09-15T00:00:00Z") })).toEqual([]);
    expect(codes({ ...eligible, dateOfBirth: new Date("1976-09-15T00:00:00Z") })).toEqual([]);
  });

  it("rejects one day outside each age boundary", () => {
    expect(codes({ ...eligible, dateOfBirth: new Date("2003-09-16T00:00:00Z") })).toEqual(["AGE"]);
    expect(codes({ ...eligible, dateOfBirth: new Date("1975-09-15T00:00:00Z") })).toEqual(["AGE"]);
  });

  it("accepts a salary of exactly 25000 and rejects one rupee less", () => {
    expect(codes({ ...eligible, monthlySalaryPaise: rupeesToPaise(25_000) })).toEqual([]);
    expect(codes({ ...eligible, monthlySalaryPaise: rupeesToPaise(24_999) })).toEqual(["SALARY"]);
  });

  it("rejects an unemployed applicant but allows self-employed", () => {
    expect(codes({ ...eligible, employmentMode: "UNEMPLOYED" })).toEqual(["EMPLOYMENT"]);
    expect(codes({ ...eligible, employmentMode: "SELF_EMPLOYED" })).toEqual([]);
  });

  it("returns every failure, not just the first", () => {
    expect(
      codes({
        pan: "bad",
        dateOfBirth: new Date("2010-01-01T00:00:00Z"),
        monthlySalaryPaise: rupeesToPaise(1_000),
        employmentMode: "UNEMPLOYED",
      }),
    ).toEqual(["AGE", "EMPLOYMENT", "PAN", "SALARY"]);
  });
});
