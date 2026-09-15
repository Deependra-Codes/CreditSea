/** Integer paise. Rupees cannot be passed where this is expected. */
export type Paise = number & { readonly __brand: "Paise" };

/** Positivity is the contract layer's concern; this only guards precision. */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new RangeError("Amount must be a finite number.");
  }
  // toFixed first: Math.round(1.005 * 100) is 100, not 101.
  const paise = Math.round(Number((rupees * 100).toFixed(4)));
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError("Amount is outside the safe integer range.");
  }
  return paise as Paise;
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

const FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPaise(paise: Paise): string {
  return FORMATTER.format(paiseToRupees(paise)).replace(/ /g, "");
}
