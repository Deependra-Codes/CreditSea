import type { Role } from "@lms/domain";

export const SEED_PASSWORD = "Password@123";

export const SEED_ACCOUNTS: ReadonlyArray<{ fullName: string; email: string; role: Role }> = [
  { fullName: "Admin User", email: "admin@lms.test", role: "ADMIN" },
  { fullName: "Sales Executive", email: "sales@lms.test", role: "SALES" },
  { fullName: "Sanction Executive", email: "sanction@lms.test", role: "SANCTION" },
  { fullName: "Disbursement Executive", email: "disbursement@lms.test", role: "DISBURSEMENT" },
  { fullName: "Collection Executive", email: "collection@lms.test", role: "COLLECTION" },
  { fullName: "Demo Borrower", email: "borrower@lms.test", role: "BORROWER" },
];
