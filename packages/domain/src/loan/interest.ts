import type { Paise } from "../money/paise";

export const INTEREST_RATE_BPS = 1200; // 12.00% p.a.
export const MIN_PRINCIPAL_PAISE = 5_000_000 as Paise;
export const MAX_PRINCIPAL_PAISE = 50_000_000 as Paise;
export const MIN_TENURE_DAYS = 30;
export const MAX_TENURE_DAYS = 365;

export type LoanQuote = {
  principalPaise: Paise;
  tenureDays: number;
  interestRateBps: number;
  interestPaise: Paise;
  totalRepayablePaise: Paise;
};

/**
 * SI = (P × R × T) / (365 × 100). With the rate in basis points the divisor
 * becomes 365 × 10_000. Largest intermediate is ~2.19e13, well inside
 * MAX_SAFE_INTEGER, so plain numbers hold.
 */
export function quoteLoan(principalPaise: Paise, tenureDays: number): LoanQuote {
  if (principalPaise < MIN_PRINCIPAL_PAISE || principalPaise > MAX_PRINCIPAL_PAISE) {
    throw new RangeError("Loan principal must be between ₹50,000 and ₹5,00,000.");
  }
  if (
    !Number.isInteger(tenureDays) ||
    tenureDays < MIN_TENURE_DAYS ||
    tenureDays > MAX_TENURE_DAYS
  ) {
    throw new RangeError("Loan tenure must be a whole number of days between 30 and 365.");
  }

  const interestPaise = Math.round(
    (principalPaise * INTEREST_RATE_BPS * tenureDays) / (365 * 10_000),
  ) as Paise;

  return {
    principalPaise,
    tenureDays,
    interestRateBps: INTEREST_RATE_BPS,
    interestPaise,
    totalRepayablePaise: (principalPaise + interestPaise) as Paise,
  };
}
