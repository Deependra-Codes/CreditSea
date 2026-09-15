import { MODULE_ROLES, type ModuleName, type Role } from "@lms/domain";

/** Not a lifecycle stage — an aggregate across all four, so ADMIN only. */
export const OVERVIEW = "overview" as const;
export type DashboardSection = ModuleName | typeof OVERVIEW;

export const OVERVIEW_META = {
  label: "Overview",
  blurb: "The whole book, across all four modules.",
} as const;

export const MODULE_META = {
  sales: { label: "Sales", blurb: "Registered borrowers and where they are in the funnel." },
  sanction: { label: "Sanction", blurb: "Applications waiting on an approve or reject decision." },
  disbursement: {
    label: "Disbursement",
    blurb: "Sanctioned loans waiting for funds to be released.",
  },
  collection: {
    label: "Collection",
    blurb: "Active loans. Record a payment; the loan closes itself when it is settled.",
  },
} as const satisfies Record<ModuleName, { label: string; blurb: string }>;

export const isModuleName = (value: string): value is ModuleName => value in MODULE_META;

export const isSection = (value: string): value is DashboardSection =>
  value === OVERVIEW || isModuleName(value);

/** Cosmetic: the API refuses the rest regardless of what the nav shows. */
export const sectionsFor = (role: Role): DashboardSection[] => {
  const modules = (Object.keys(MODULE_META) as ModuleName[]).filter((module) =>
    (MODULE_ROLES[module] as readonly Role[]).includes(role),
  );
  return role === "ADMIN" ? [OVERVIEW, ...modules] : modules;
};
