import { MODULE_ROLES, type ModuleName, type Role } from "@lms/domain";

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

/** Cosmetic: the API refuses the rest regardless of what the nav shows. */
export const modulesFor = (role: Role): ModuleName[] =>
  (Object.keys(MODULE_META) as ModuleName[]).filter((module) =>
    (MODULE_ROLES[module] as readonly Role[]).includes(role),
  );
