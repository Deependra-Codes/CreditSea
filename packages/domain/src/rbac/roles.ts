export const ROLES = [
  "ADMIN",
  "SALES",
  "SANCTION",
  "DISBURSEMENT",
  "COLLECTION",
  "BORROWER",
] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = ["sales", "sanction", "disbursement", "collection"] as const;
export type ModuleName = (typeof MODULES)[number];

export const MODULE_ROLES = {
  sales: ["SALES", "ADMIN"],
  sanction: ["SANCTION", "ADMIN"],
  disbursement: ["DISBURSEMENT", "ADMIN"],
  collection: ["COLLECTION", "ADMIN"],
} as const satisfies Record<ModuleName, readonly Role[]>;
