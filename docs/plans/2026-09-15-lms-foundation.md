# LMS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the pnpm monorepo with a fully tested zero-dependency domain package and working cookie-based auth + RBAC, so all six seeded roles can log in and every business rule is proven by tests before any UI exists.

**Architecture:** A pnpm workspace with two libraries and two apps. `packages/domain` holds every business rule as pure functions with no runtime dependencies, so it tests in milliseconds and is imported identically by the Express API and the Next.js web app. `packages/contracts` wraps those rules in zod schemas that serve as both runtime validation and inferred TypeScript types. The API layers `authenticate` and `authorize` middleware over Mongoose models.

**Tech Stack:** pnpm workspaces · TypeScript 5.9 (strict) · vitest · Express 5 · Mongoose 8 · MongoDB Atlas · zod 4 · jsonwebtoken · bcryptjs · Biome · dependency-cruiser

**Spec:** `docs/specs/2026-09-15-lms-design.md`

## Global Constraints

- Node `>=20.9.0`. pnpm via `corepack enable pnpm` — pnpm is **not** installed on this machine.
- `packages/domain` declares **zero** runtime dependencies. vitest is a devDependency only.
- All money is **integer paise** internally; every API payload carries **rupees**. Conversion happens only in `packages/contracts`.
- A field name ending in `Paise` is an integer in paise and never appears in a payload.
- Interest rate is stored as basis points: `1200` = 12.00% p.a.
- Principal bounds: `5_000_000 … 50_000_000` paise (₹50K–₹5L). Tenure: `30 … 365` days. Salary floor: `2_500_000` paise (₹25,000).
- Age range is inclusive `[23, 50]`. Salary rejects only when strictly below the floor.
- `401` = unauthenticated, `403` = authenticated but wrong role.
- File limits: 300 lines per file, 220 per React file, 60 per function.
- Folder names `utils`, `helpers`, `misc`, `temp` are forbidden.
- Secrets live in `.env` (gitignored). `.env.example` carries placeholders only.

---

### Task 1: Workspace skeleton

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `biome.json`, `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm install` and `pnpm typecheck` run clean from the repo root; every later package extends `tsconfig.base.json`.

- [ ] **Step 1: Enable pnpm**

```bash
corepack enable pnpm
pnpm --version   # expect 10.x
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "lms",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "typecheck": "pnpm -r exec tsc --noEmit",
    "test": "pnpm -r test",
    "lint": "biome check .",
    "format": "biome check --write .",
    "boundaries": "depcruise packages apps --config dependency-cruiser.cjs",
    "dev": "pnpm -r --parallel dev",
    "seed": "pnpm --filter @lms/api seed"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "dependency-cruiser": "^16.10.4",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are the two strict flags most people leave off. They are on because the transition table is indexed dynamically and optional fields on loans must not silently accept `undefined`.

- [ ] **Step 5: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignore": ["node_modules/**", ".next/**", "dist/**", "uploads/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": { "enabled": true },
  "javascript": {
    "formatter": { "quoteStyle": "double", "semicolons": "always", "trailingCommas": "all" }
  }
}
```

- [ ] **Step 6: Create `.env.example`**

```bash
# API
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lms?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-string
WEB_ORIGIN=http://localhost:3000
UPLOAD_DIR=./uploads

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 7: Install and verify**

```bash
pnpm install
pnpm lint
```

Expected: install succeeds, `biome check` reports no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm workspace with strict TS and Biome"
```

---

### Task 2: Domain — money

**Files:**
- Create: `packages/domain/package.json`, `packages/domain/tsconfig.json`, `packages/domain/vitest.config.ts`
- Create: `packages/domain/src/money/paise.ts`
- Test: `packages/domain/src/money/paise.test.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` from Task 1
- Produces:
  - `type Paise = number & { readonly __brand: "Paise" }`
  - `rupeesToPaise(rupees: number): Paise`
  - `paiseToRupees(p: Paise): number`
  - `formatPaise(p: Paise): string`

- [ ] **Step 1: Create the package manifest**

`packages/domain/package.json` — note `dependencies` is absent entirely, which is the point of this package:

```json
{
  "name": "@lms/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "dev": "vitest" },
  "devDependencies": { "vitest": "^3.2.4", "typescript": "^5.9.3" }
}
```

`packages/domain/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }
```

`packages/domain/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
```

- [ ] **Step 2: Write the failing test**

`packages/domain/src/money/paise.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatPaise, paiseToRupees, rupeesToPaise } from "./paise";

describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(rupeesToPaise(50_000)).toBe(5_000_000);
  });

  it("converts paise-precision amounts without float drift", () => {
    expect(rupeesToPaise(493.15)).toBe(49_315);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("rounds half away from zero at the paise boundary", () => {
    expect(rupeesToPaise(1.005)).toBe(101);
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
```

The `0.1 + 0.2` case is deliberate: it equals `0.30000000000000004`, and a naive `Math.round(r * 100)` must still yield `30`.

`rupeesToPaise(1.005)` is the classic float trap — `1.005 * 100` is `100.49999999999999` in IEEE-754, so `Math.round` alone returns `100`. The implementation must correct for this.

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @lms/domain test
```

Expected: FAIL — `Cannot find module './paise'`.

- [ ] **Step 4: Implement**

`packages/domain/src/money/paise.ts`:

```ts
/** An integer number of paise. Rupees cannot be passed where this is expected. */
export type Paise = number & { readonly __brand: "Paise" };

/**
 * Convert rupees to integer paise.
 *
 * `Math.round(rupees * 100)` alone is wrong: 1.005 * 100 is 100.49999999999999
 * in IEEE-754, which rounds down to 100 instead of 101. Rounding the product to
 * a few decimal places first removes the representation error before rounding.
 */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(Number((rupees * 100).toFixed(4))) as Paise;
}

export function paiseToRupees(p: Paise): number {
  return p / 100;
}

const FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPaise(p: Paise): string {
  return FORMATTER.format(paiseToRupees(p));
}
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
pnpm --filter @lms/domain test
```

Expected: PASS, 6 assertions.

If `formatPaise` fails on a non-breaking-space between `₹` and the digits, normalise with `.replace(/ /g, "")` inside the function rather than loosening the test.

- [ ] **Step 6: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add branded Paise type with float-safe conversion"
```

---

### Task 3: Domain — BRE

**Files:**
- Create: `packages/domain/src/bre/pan.ts`, `packages/domain/src/bre/age.ts`, `packages/domain/src/bre/evaluate.ts`
- Test: `packages/domain/src/bre/pan.test.ts`, `packages/domain/src/bre/age.test.ts`, `packages/domain/src/bre/evaluate.test.ts`

**Interfaces:**
- Consumes: `Paise` from Task 2
- Produces:
  - `PAN_FORMAT: RegExp`, `PAN_STRICT: RegExp`
  - `calculateAge(dob: Date, asOf: Date): number`
  - `type EmploymentMode = "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED"`
  - `type Applicant = { pan: string; dateOfBirth: Date; monthlySalaryPaise: Paise; employmentMode: EmploymentMode }`
  - `type BreFailure = { code: BreCode; message: string }`
  - `type BreResult = { passed: boolean; failures: BreFailure[] }`
  - `evaluateBre(a: Applicant, asOf?: Date): BreResult`

- [ ] **Step 1: Write the failing PAN test**

`packages/domain/src/bre/pan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PAN_FORMAT, PAN_STRICT } from "./pan";

describe("PAN_FORMAT (enforced)", () => {
  it("accepts the canonical shape", () => {
    expect(PAN_FORMAT.test("ABCPE1234F")).toBe(true);
  });

  it("accepts common demo values whose 4th char is not a real holder type", () => {
    // Guards the documented trade-off: swapping in PAN_STRICT breaks this.
    expect(PAN_FORMAT.test("ABCDE1234F")).toBe(true);
  });

  it("rejects wrong length, lowercase, and transposed groups", () => {
    expect(PAN_FORMAT.test("ABCDE1234")).toBe(false);
    expect(PAN_FORMAT.test("abcde1234f")).toBe(false);
    expect(PAN_FORMAT.test("ABCD12345F")).toBe(false);
    expect(PAN_FORMAT.test("")).toBe(false);
  });
});

describe("PAN_STRICT (documented, not enforced)", () => {
  it("accepts a valid individual PAN", () => {
    expect(PAN_STRICT.test("ABCPE1234F")).toBe(true);
  });

  it("rejects an invalid holder-type character", () => {
    expect(PAN_STRICT.test("ABCDE1234F")).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing age test**

`packages/domain/src/bre/age.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateAge } from "./age";

const asOf = new Date("2026-09-15T00:00:00Z");

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
```

Plain year subtraction returns 26 for all four cases, so these tests are what make the "accounting for month and day" decision real.

- [ ] **Step 3: Write the failing evaluate test**

`packages/domain/src/bre/evaluate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "../money/paise";
import { type Applicant, evaluateBre } from "./evaluate";

const asOf = new Date("2026-09-15T00:00:00Z");
const codes = (a: Applicant) => evaluateBre(a, asOf).failures.map((f) => f.code).sort();

const eligible: Applicant = {
  pan: "ABCDE1234F",
  dateOfBirth: new Date("1995-01-01T00:00:00Z"), // 31 on asOf
  monthlySalaryPaise: rupeesToPaise(30_000),
  employmentMode: "SALARIED",
};

describe("evaluateBre", () => {
  it("passes a fully eligible applicant", () => {
    expect(evaluateBre(eligible, asOf)).toEqual({ passed: true, failures: [] });
  });

  it("accepts the inclusive age boundaries 23 and 50", () => {
    const at23 = { ...eligible, dateOfBirth: new Date("2003-09-15T00:00:00Z") };
    const at50 = { ...eligible, dateOfBirth: new Date("1976-09-15T00:00:00Z") };
    expect(codes(at23)).toEqual([]);
    expect(codes(at50)).toEqual([]);
  });

  it("rejects one day outside each age boundary", () => {
    const just22 = { ...eligible, dateOfBirth: new Date("2003-09-16T00:00:00Z") };
    const just51 = { ...eligible, dateOfBirth: new Date("1975-09-15T00:00:00Z") };
    expect(codes(just22)).toEqual(["AGE"]);
    expect(codes(just51)).toEqual(["AGE"]);
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
```

The last test is the one that matters for UX: a borrower with four problems must see four messages once, not discover them across four submissions.

- [ ] **Step 4: Run all three and confirm they fail**

```bash
pnpm --filter @lms/domain test
```

Expected: FAIL — modules `./pan`, `./age`, `./evaluate` not found.

- [ ] **Step 5: Implement `pan.ts`**

```ts
/**
 * Enforced PAN pattern: five letters, four digits, one letter.
 *
 * DO NOT swap this for PAN_STRICT. The 4th character of a real PAN is a
 * holder-type code (P individual, C company, H HUF, F firm, T trust, ...),
 * but widely-used demo values such as ABCDE1234F carry an invalid 'D' there.
 * Rejecting them reads as a bug to anyone testing the system. PAN_STRICT is
 * kept and tested below so the knowledge is not lost — it is simply not the
 * rule we apply. A test asserts ABCDE1234F passes, so this swap fails CI.
 */
export const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Correct-by-the-book PAN, including the holder-type charset. Documented, not enforced. */
export const PAN_STRICT = /^[A-Z]{3}[ABCFGHLJPTE][A-Z][0-9]{4}[A-Z]$/;
```

- [ ] **Step 6: Implement `age.ts`**

```ts
/** Completed years between `dob` and `asOf`, accounting for month and day. */
export function calculateAge(dob: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}
```

- [ ] **Step 7: Implement `evaluate.ts`**

```ts
import type { Paise } from "../money/paise";
import { calculateAge } from "./age";
import { PAN_FORMAT } from "./pan";

export const MIN_AGE = 23;
export const MAX_AGE = 50;
export const MIN_MONTHLY_SALARY_PAISE = 2_500_000 as Paise;

export type EmploymentMode = "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED";
export type BreCode = "AGE" | "SALARY" | "PAN" | "EMPLOYMENT";

export type Applicant = {
  pan: string;
  dateOfBirth: Date;
  monthlySalaryPaise: Paise;
  employmentMode: EmploymentMode;
};

export type BreFailure = { code: BreCode; message: string };
export type BreResult = { passed: boolean; failures: BreFailure[] };

type BreRule = {
  code: BreCode;
  message: string;
  /** Returns true when the applicant passes this rule. */
  check: (a: Applicant, asOf: Date) => boolean;
};

/** Rules are data, so adding one is a list entry rather than a new branch. */
export const BRE_RULES: readonly BreRule[] = [
  {
    code: "AGE",
    message: `Age must be between ${MIN_AGE} and ${MAX_AGE} years.`,
    check: (a, asOf) => {
      const age = calculateAge(a.dateOfBirth, asOf);
      return age >= MIN_AGE && age <= MAX_AGE;
    },
  },
  {
    code: "SALARY",
    message: "Monthly salary must be at least ₹25,000.",
    check: (a) => a.monthlySalaryPaise >= MIN_MONTHLY_SALARY_PAISE,
  },
  {
    code: "PAN",
    message: "PAN must be 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F).",
    check: (a) => PAN_FORMAT.test(a.pan),
  },
  {
    code: "EMPLOYMENT",
    message: "Unemployed applicants are not eligible.",
    check: (a) => a.employmentMode !== "UNEMPLOYED",
  },
];

/** Evaluates every rule and reports all failures, so the applicant sees them at once. */
export function evaluateBre(applicant: Applicant, asOf: Date = new Date()): BreResult {
  const failures = BRE_RULES.filter((rule) => !rule.check(applicant, asOf)).map(
    ({ code, message }) => ({ code, message }),
  );
  return { passed: failures.length === 0, failures };
}
```

- [ ] **Step 8: Run and confirm all pass**

```bash
pnpm --filter @lms/domain test
```

Expected: PASS — 3 files, 15 tests.

- [ ] **Step 9: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add BRE with inclusive boundaries and all-failure reporting"
```

---

### Task 4: Domain — interest

**Files:**
- Create: `packages/domain/src/loan/interest.ts`
- Test: `packages/domain/src/loan/interest.test.ts`

**Interfaces:**
- Consumes: `Paise` from Task 2
- Produces:
  - `INTEREST_RATE_BPS: 1200`, `MIN_PRINCIPAL_PAISE`, `MAX_PRINCIPAL_PAISE`, `MIN_TENURE_DAYS`, `MAX_TENURE_DAYS`
  - `type LoanQuote = { principalPaise: Paise; tenureDays: number; interestRateBps: number; interestPaise: Paise; totalRepayablePaise: Paise }`
  - `quoteLoan(principalPaise: Paise, tenureDays: number): LoanQuote`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/loan/interest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "../money/paise";
import { quoteLoan } from "./interest";

describe("quoteLoan", () => {
  it("matches the spec anchor for ₹50,000 over 30 days", () => {
    const q = quoteLoan(rupeesToPaise(50_000), 30);
    expect(q.interestPaise).toBe(49_315); // 18,000,000 / 36,500 = 493.1506...
    expect(q.totalRepayablePaise).toBe(5_049_315);
  });

  it("matches the spec anchor for ₹5,00,000 over 365 days", () => {
    const q = quoteLoan(rupeesToPaise(500_000), 365);
    expect(q.interestPaise).toBe(6_000_000); // exactly 12% of 5L
    expect(q.totalRepayablePaise).toBe(56_000_000);
  });

  it("stays within safe integer range at the maximum", () => {
    const q = quoteLoan(rupeesToPaise(500_000), 365);
    expect(Number.isSafeInteger(q.totalRepayablePaise)).toBe(true);
  });

  it("always produces integers", () => {
    for (const days of [30, 31, 97, 200, 364, 365]) {
      const q = quoteLoan(rupeesToPaise(123_456), days);
      expect(Number.isInteger(q.interestPaise)).toBe(true);
      expect(Number.isInteger(q.totalRepayablePaise)).toBe(true);
    }
  });

  it("rejects a principal or tenure outside the allowed bounds", () => {
    expect(() => quoteLoan(rupeesToPaise(49_999), 30)).toThrow(/principal/i);
    expect(() => quoteLoan(rupeesToPaise(500_001), 30)).toThrow(/principal/i);
    expect(() => quoteLoan(rupeesToPaise(50_000), 29)).toThrow(/tenure/i);
    expect(() => quoteLoan(rupeesToPaise(50_000), 366)).toThrow(/tenure/i);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

```bash
pnpm --filter @lms/domain test interest
```

Expected: FAIL — `./interest` not found.

- [ ] **Step 3: Implement**

`packages/domain/src/loan/interest.ts`:

```ts
import type { Paise } from "../money/paise";

export const INTEREST_RATE_BPS = 1200; // 12.00% p.a.
export const MIN_PRINCIPAL_PAISE = 5_000_000 as Paise; // ₹50,000
export const MAX_PRINCIPAL_PAISE = 50_000_000 as Paise; // ₹5,00,000
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
 * Simple interest in integer paise.
 *
 * SI = (P × R × T) / (365 × 100) with R as a percentage. Storing the rate in
 * basis points (R_bps = R × 100) turns the divisor into 365 × 10_000. The
 * largest intermediate is 50_000_000 × 1200 × 365 ≈ 2.19e13, far below
 * Number.MAX_SAFE_INTEGER (9.007e15), so plain numbers are safe here.
 */
export function quoteLoan(principalPaise: Paise, tenureDays: number): LoanQuote {
  if (principalPaise < MIN_PRINCIPAL_PAISE || principalPaise > MAX_PRINCIPAL_PAISE) {
    throw new RangeError(`principal must be between ₹50,000 and ₹5,00,000`);
  }
  if (
    !Number.isInteger(tenureDays) ||
    tenureDays < MIN_TENURE_DAYS ||
    tenureDays > MAX_TENURE_DAYS
  ) {
    throw new RangeError(`tenure must be a whole number of days between 30 and 365`);
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
```

- [ ] **Step 4: Run and confirm it passes**

```bash
pnpm --filter @lms/domain test interest
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add integer-paise simple interest with bounds checks"
```

---

### Task 5: Domain — roles and transitions

**Files:**
- Create: `packages/domain/src/rbac/roles.ts`, `packages/domain/src/loan/transitions.ts`, `packages/domain/src/index.ts`
- Test: `packages/domain/src/loan/transitions.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `type Role = "ADMIN" | "SALES" | "SANCTION" | "DISBURSEMENT" | "COLLECTION" | "BORROWER"`
  - `type LoanStatus = "APPLIED" | "SANCTIONED" | "DISBURSED" | "CLOSED" | "REJECTED"`
  - `MODULE_ROLES: Record<ModuleName, readonly Role[]>`
  - `QUEUE_STATUS: Record<"SANCTION" | "DISBURSEMENT" | "COLLECTION", LoanStatus>`
  - `checkTransition(from, to, role): TransitionCheck`
  - `allowedTransitions(from: LoanStatus): LoanStatus[]`
  - `packages/domain/src/index.ts` re-exports everything above plus Tasks 2–4

- [ ] **Step 1: Write the failing test**

`packages/domain/src/loan/transitions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { allowedTransitions, checkTransition } from "./transitions";

describe("checkTransition", () => {
  it("allows each legal transition for its owning role", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "SANCTION")).toEqual({ ok: true });
    expect(checkTransition("APPLIED", "REJECTED", "SANCTION")).toEqual({ ok: true });
    expect(checkTransition("SANCTIONED", "DISBURSED", "DISBURSEMENT")).toEqual({ ok: true });
    expect(checkTransition("DISBURSED", "CLOSED", "COLLECTION")).toEqual({ ok: true });
  });

  it("allows ADMIN on every legal transition", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "ADMIN")).toEqual({ ok: true });
    expect(checkTransition("SANCTIONED", "DISBURSED", "ADMIN")).toEqual({ ok: true });
    expect(checkTransition("DISBURSED", "CLOSED", "ADMIN")).toEqual({ ok: true });
  });

  it("refuses a legal transition driven by the wrong role", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "DISBURSEMENT")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
    expect(checkTransition("SANCTIONED", "DISBURSED", "SANCTION")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
  });

  it("refuses skipping a stage even for ADMIN", () => {
    expect(checkTransition("APPLIED", "DISBURSED", "ADMIN")).toEqual({
      ok: false,
      reason: "INVALID_TRANSITION",
    });
    expect(checkTransition("APPLIED", "CLOSED", "ADMIN")).toEqual({
      ok: false,
      reason: "INVALID_TRANSITION",
    });
  });

  it("refuses moving out of a terminal status", () => {
    expect(checkTransition("CLOSED", "DISBURSED", "ADMIN").ok).toBe(false);
    expect(checkTransition("REJECTED", "APPLIED", "ADMIN").ok).toBe(false);
  });

  it("refuses any transition driven by a BORROWER", () => {
    expect(checkTransition("APPLIED", "SANCTIONED", "BORROWER")).toEqual({
      ok: false,
      reason: "FORBIDDEN_ROLE",
    });
  });
});

describe("allowedTransitions", () => {
  it("reports the outgoing edges of each status", () => {
    expect(allowedTransitions("APPLIED").sort()).toEqual(["REJECTED", "SANCTIONED"]);
    expect(allowedTransitions("SANCTIONED")).toEqual(["DISBURSED"]);
    expect(allowedTransitions("CLOSED")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

```bash
pnpm --filter @lms/domain test transitions
```

Expected: FAIL — `./transitions` not found.

- [ ] **Step 3: Implement `rbac/roles.ts`**

```ts
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
```

- [ ] **Step 4: Implement `loan/transitions.ts`**

```ts
import type { Role } from "../rbac/roles";

export const LOAN_STATUSES = [
  "APPLIED",
  "SANCTIONED",
  "DISBURSED",
  "CLOSED",
  "REJECTED",
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

/**
 * The entire loan lifecycle and its permissions in one table: which statuses
 * follow which, and the role that owns each move.
 *
 * `satisfies` keeps it exhaustive — adding a status without a row here is a
 * compile error, so the lifecycle and its RBAC cannot drift apart.
 */
export const TRANSITIONS = {
  APPLIED: { SANCTIONED: "SANCTION", REJECTED: "SANCTION" },
  SANCTIONED: { DISBURSED: "DISBURSEMENT" },
  DISBURSED: { CLOSED: "COLLECTION" },
  CLOSED: {},
  REJECTED: {},
} as const satisfies Record<LoanStatus, Partial<Record<LoanStatus, Role>>>;

/** The status each executive module works on. */
export const QUEUE_STATUS = {
  SANCTION: "APPLIED",
  DISBURSEMENT: "SANCTIONED",
  COLLECTION: "DISBURSED",
} as const satisfies Record<string, LoanStatus>;

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: "INVALID_TRANSITION" | "FORBIDDEN_ROLE" };

export function allowedTransitions(from: LoanStatus): LoanStatus[] {
  return Object.keys(TRANSITIONS[from]) as LoanStatus[];
}

/**
 * ADMIN is one explicit clause here, not an exception sprinkled through the
 * codebase — a privilege that lives in prose is a privilege nobody can audit.
 * Note ADMIN widens *who* may act, never *what* is legal: a skipped stage stays
 * illegal for everyone.
 */
export function checkTransition(from: LoanStatus, to: LoanStatus, role: Role): TransitionCheck {
  const owner = (TRANSITIONS[from] as Partial<Record<LoanStatus, Role>>)[to];
  if (owner === undefined) return { ok: false, reason: "INVALID_TRANSITION" };
  if (role !== owner && role !== "ADMIN") return { ok: false, reason: "FORBIDDEN_ROLE" };
  return { ok: true };
}
```

- [ ] **Step 5: Create the package barrel**

`packages/domain/src/index.ts`:

```ts
export * from "./bre/age";
export * from "./bre/evaluate";
export * from "./bre/pan";
export * from "./loan/interest";
export * from "./loan/transitions";
export * from "./money/paise";
export * from "./rbac/roles";
```

- [ ] **Step 6: Run the whole domain suite and typecheck**

```bash
pnpm --filter @lms/domain test
pnpm typecheck
```

Expected: PASS — 4 test files, ~28 tests. Typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add exhaustive loan transition table with explicit ADMIN clause"
```

---

### Task 6: Contracts package

**Files:**
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/api.ts`, `packages/contracts/src/money.ts`, `packages/contracts/src/auth.ts`, `packages/contracts/src/application.ts`, `packages/contracts/src/loan.ts`, `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: `@lms/domain` — `EmploymentMode`, `Role`, `rupeesToPaise`, `MIN_PRINCIPAL_PAISE`, `MAX_PRINCIPAL_PAISE`, `MIN_TENURE_DAYS`, `MAX_TENURE_DAYS`, `PAN_FORMAT`
- Produces:
  - `type ApiResult<T>`, `ok<T>(data)`, `fail(code, message, details?)`
  - `registerSchema`, `loginSchema`, `profileSchema`, `createLoanSchema`, `sanctionSchema`, `paymentSchema`
  - Inferred types: `RegisterInput`, `LoginInput`, `ProfileInput`, `CreateLoanInput`, `SanctionInput`, `PaymentInput`
  - `rupeeAmount(min, max)` — the single rupees→paise boundary helper

- [ ] **Step 1: Create the manifest**

`packages/contracts/package.json`:

```json
{
  "name": "@lms/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "echo \"no tests\" && exit 0" },
  "dependencies": { "@lms/domain": "workspace:*", "zod": "^4.3.6" },
  "devDependencies": { "typescript": "^5.9.3" }
}
```

`workspace:*` is pnpm-specific and resolves to the local package. A bare `*` would fall back to the npm registry.

`packages/contracts/tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*.ts"] }
```

- [ ] **Step 2: Implement the API envelope**

`packages/contracts/src/api.ts`:

```ts
export type ApiError = { code: string; message: string; details?: unknown };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
export const fail = (code: string, message: string, details?: unknown): ApiResult<never> => ({
  ok: false,
  error: details === undefined ? { code, message } : { code, message, details },
});
```

- [ ] **Step 3: Implement the rupees boundary helper**

`packages/contracts/src/money.ts`:

```ts
import { type Paise, rupeesToPaise } from "@lms/domain";
import { z } from "zod";

/**
 * The single place rupees become paise. Payloads speak rupees because that is
 * what a person types and reads; everything behind this line is integer paise.
 */
export const rupeeAmount = (minPaise: Paise, maxPaise: Paise) =>
  z
    .number()
    .finite()
    .positive()
    .transform((rupees) => rupeesToPaise(rupees))
    .refine((p) => p >= minPaise && p <= maxPaise, {
      message: `Amount must be between ₹${minPaise / 100} and ₹${maxPaise / 100}`,
    });
```

- [ ] **Step 4: Implement the auth schemas**

`packages/contracts/src/auth.ts`:

```ts
import { ROLES } from "@lms/domain";
import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72), // bcrypt truncates beyond 72 bytes
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const publicUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
```

The 72-character cap is not arbitrary: bcrypt silently ignores bytes past 72, so accepting longer passwords would quietly weaken them.

- [ ] **Step 5: Implement the application and loan schemas**

`packages/contracts/src/application.ts`:

```ts
import { MIN_MONTHLY_SALARY_PAISE, PAN_FORMAT, rupeesToPaise } from "@lms/domain";
import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  pan: z.string().trim().toUpperCase().regex(PAN_FORMAT, "Invalid PAN format"),
  dateOfBirth: z.coerce.date(),
  monthlySalary: z.number().finite().positive().transform(rupeesToPaise),
  employmentMode: z.enum(["SALARIED", "SELF_EMPLOYED", "UNEMPLOYED"]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export { MIN_MONTHLY_SALARY_PAISE };
```

`packages/contracts/src/loan.ts`:

```ts
import {
  MAX_PRINCIPAL_PAISE,
  MAX_TENURE_DAYS,
  MIN_PRINCIPAL_PAISE,
  MIN_TENURE_DAYS,
  rupeesToPaise,
} from "@lms/domain";
import { z } from "zod";
import { rupeeAmount } from "./money";

export const createLoanSchema = z.object({
  amount: rupeeAmount(MIN_PRINCIPAL_PAISE, MAX_PRINCIPAL_PAISE),
  tenureDays: z.number().int().min(MIN_TENURE_DAYS).max(MAX_TENURE_DAYS),
});

export const sanctionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .refine((v) => v.decision !== "REJECT" || (v.reason?.length ?? 0) >= 3, {
    message: "A reason is required when rejecting",
    path: ["reason"],
  });

export const paymentSchema = z.object({
  utr: z.string().trim().toUpperCase().min(6).max(32),
  amount: z.number().finite().positive().transform(rupeesToPaise),
  // Must be a refine, not `.max(new Date())`: the latter freezes "now" at module
  // load, so a long-running server would drift and start rejecting valid dates.
  paidAt: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now(), "Payment date cannot be in the future"),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type SanctionInput = z.infer<typeof sanctionSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
```

`packages/contracts/src/index.ts`:

```ts
export * from "./api";
export * from "./application";
export * from "./auth";
export * from "./loan";
export * from "./money";
```

- [ ] **Step 6: Install and typecheck**

```bash
pnpm install
pnpm typecheck
```

Expected: clean. If `@lms/domain` does not resolve, confirm `pnpm-workspace.yaml` lists `packages/*` and re-run `pnpm install`.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts
git commit -m "feat(contracts): add zod schemas with a single rupees-to-paise boundary"
```

---

### Task 7: API skeleton and models

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`
- Create: `apps/api/src/lib/env.ts`, `apps/api/src/lib/db.ts`, `apps/api/src/lib/http-error.ts`
- Create: `apps/api/src/models/user.ts`, `borrower-profile.ts`, `loan.ts`, `payment.ts`
- Create: `apps/api/src/middleware/error.ts`, `apps/api/src/middleware/validate.ts`
- Create: `apps/api/src/app.ts`, `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `@lms/domain`, `@lms/contracts`
- Produces:
  - `env` — validated config object
  - `connectDb(uri: string): Promise<void>`
  - `HttpError` with `status`, `code`
  - Mongoose models `User`, `BorrowerProfile`, `Loan`, `Payment`
  - `validate(schema, source)` middleware putting the parsed value on `req.valid`
  - `createApp(): Express`

- [ ] **Step 1: Create the manifest**

`apps/api/package.json`:

```json
{
  "name": "@lms/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "seed": "tsx src/seed/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@lms/contracts": "workspace:*",
    "@lms/domain": "workspace:*",
    "bcryptjs": "^3.0.2",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.0",
    "multer": "^2.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/multer": "^1.4.12",
    "@types/node": "^24.10.1",
    "tsx": "^4.19.2",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

`bcryptjs` rather than `bcrypt`: same algorithm, pure JavaScript, no node-gyp build step for the evaluator.

`apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"], "moduleResolution": "bundler" },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Implement validated env**

`apps/api/src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
```

Failing at startup with a readable message beats discovering a missing `JWT_SECRET` when the first login returns 500.

- [ ] **Step 3: Implement the db connector and error type**

`apps/api/src/lib/db.ts`:

```ts
import mongoose from "mongoose";

export async function connectDb(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}
```

`apps/api/src/lib/http-error.ts`:

```ts
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static unauthorized = () => new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");
  static forbidden = () =>
    new HttpError(403, "FORBIDDEN", "Your role does not have access to this resource.");
  static notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found.`);
  static conflict = (code: string, message: string) => new HttpError(409, code, message);
}
```

- [ ] **Step 4: Implement the models**

`apps/api/src/models/user.ts`:

```ts
import { ROLES, type Role } from "@lms/domain";
import { type InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "BORROWER" },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { role: Role };
export const User = model("User", userSchema);
```

`apps/api/src/models/borrower-profile.ts`:

```ts
import { type InferSchemaType, Schema, Types, model } from "mongoose";

const borrowerProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, unique: true, uppercase: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalaryPaise: { type: Number, required: true, min: 0 },
    employmentMode: {
      type: String,
      enum: ["SALARIED", "SELF_EMPLOYED", "UNEMPLOYED"],
      required: true,
    },
    bre: {
      passed: { type: Boolean, required: true },
      failures: [{ code: String, message: String }],
      evaluatedAt: { type: Date, required: true },
    },
    salarySlip: {
      type: {
        storedName: String,
        originalName: String,
        mimeType: String,
        sizeBytes: Number,
        uploadedAt: Date,
      },
      default: null,
    },
  },
  { timestamps: true },
);

export type BorrowerProfileDoc = InferSchemaType<typeof borrowerProfileSchema>;
export const BorrowerProfile = model("BorrowerProfile", borrowerProfileSchema);
```

`apps/api/src/models/loan.ts`:

```ts
import { LOAN_STATUSES, ROLES } from "@lms/domain";
import { type InferSchemaType, Schema, Types, model } from "mongoose";

const statusEventSchema = new Schema(
  {
    from: { type: String, enum: LOAN_STATUSES, required: true },
    to: { type: String, enum: LOAN_STATUSES, required: true },
    by: { type: Types.ObjectId, ref: "User", required: true },
    byRole: { type: String, enum: ROLES, required: true },
    at: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false },
);

const loanSchema = new Schema(
  {
    borrowerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    snapshot: {
      fullName: String,
      pan: String,
      dateOfBirth: Date,
      monthlySalaryPaise: Number,
      employmentMode: String,
    },
    principalPaise: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    interestRateBps: { type: Number, required: true },
    interestPaise: { type: Number, required: true },
    totalRepayablePaise: { type: Number, required: true },
    outstandingPaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: LOAN_STATUSES, required: true, default: "APPLIED" },
    statusHistory: { type: [statusEventSchema], default: [] },
    appliedAt: { type: Date, required: true },
    sanctionedAt: Date,
    disbursedAt: Date,
    closedAt: Date,
  },
  { timestamps: true },
);

// Every dashboard module queries by status, newest first.
loanSchema.index({ status: 1, appliedAt: -1 });

export type LoanDoc = InferSchemaType<typeof loanSchema>;
export const Loan = model("Loan", loanSchema);
```

`apps/api/src/models/payment.ts`:

```ts
import { type InferSchemaType, Schema, Types, model } from "mongoose";

const paymentSchema = new Schema(
  {
    loanId: { type: Types.ObjectId, ref: "Loan", required: true },
    // Unique at the database level: an application-level findOne cannot stop
    // two concurrent requests from both passing the check.
    utr: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    recordedBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ loanId: 1, paidAt: -1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const Payment = model("Payment", paymentSchema);
```

- [ ] **Step 5: Implement the validate and error middleware**

`apps/api/src/middleware/validate.ts`:

```ts
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../lib/http-error";

declare global {
  namespace Express {
    interface Request {
      valid?: unknown;
    }
  }
}

export const validate =
  <T>(schema: ZodType<T>, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new HttpError(422, "VALIDATION_FAILED", "Check the highlighted fields.",
        result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
      return;
    }
    req.valid = result.data;
    next();
  };

export const validated = <T>(req: Request): T => req.valid as T;
```

`apps/api/src/middleware/error.ts`:

```ts
import { fail } from "@lms/contracts";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail("NOT_FOUND", "Route not found."));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }
  // Duplicate key from a unique index — the UTR path relies on this.
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json(fail("DUPLICATE", "That value already exists."));
    return;
  }
  console.error(err);
  res.status(500).json(fail("INTERNAL", "Something went wrong."));
}
```

- [ ] **Step 6: Implement the app and server**

`apps/api/src/app.ts`:

```ts
import { ok } from "@lms/contracts";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/error";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json(ok({ status: "up" }));
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

`apps/api/src/server.ts`:

```ts
import { createApp } from "./app";
import { connectDb } from "./lib/db";
import { env } from "./lib/env";

async function main() {
  await connectDb(env.MONGODB_URI);
  createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
```

Express 5 forwards rejected promises from handlers to the error middleware automatically, so no `asyncHandler` wrapper is needed. Confirm this in Step 7 before relying on it in later tasks.

- [ ] **Step 7: Verify the server boots and connects**

Copy `.env.example` to `apps/api/.env`, fill in the real Atlas URI and a `JWT_SECRET`, then:

```bash
pnpm install
pnpm --filter @lms/api dev
curl -s http://localhost:4000/api/health
```

Expected: `{"ok":true,"data":{"status":"up"}}` and no Mongoose connection error.

If Atlas times out, add the current IP under Atlas → Network Access. That is the most common cause.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add Express 5 skeleton, validated env, and Mongoose models"
```

---

### Task 8: Auth and RBAC middleware

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`
- Create: `apps/api/src/middleware/authenticate.ts`, `apps/api/src/middleware/authorize.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/middleware/authorize.test.ts`

**Interfaces:**
- Consumes: `User` model, `HttpError`, `validate`, `registerSchema`, `loginSchema` from Tasks 6–7
- Produces:
  - `hashPassword(plain): Promise<string>`, `verifyPassword(plain, hash): Promise<boolean>`
  - `signToken(payload: { sub: string; role: Role }): string`
  - `authenticate` middleware setting `req.user = { id, role }`
  - `authorize(...roles: Role[])` middleware
  - Routes `POST /api/auth/register|login|logout`, `GET /api/auth/me`

- [ ] **Step 1: Write the failing authorize test**

`apps/api/src/middleware/authorize.test.ts`:

```ts
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../lib/http-error";
import { authorize } from "./authorize";

const run = (role: string | undefined, allowed: Parameters<typeof authorize>) => {
  const req = { user: role ? { id: "u1", role } : undefined } as unknown as Request;
  const next = vi.fn() as unknown as NextFunction;
  authorize(...allowed)(req, {} as Response, next);
  return next as unknown as ReturnType<typeof vi.fn>;
};

describe("authorize", () => {
  it("calls next with no error for a permitted role", () => {
    expect(run("SANCTION", ["SANCTION"]).mock.calls[0]?.[0]).toBeUndefined();
  });

  it("always permits ADMIN", () => {
    expect(run("ADMIN", ["COLLECTION"]).mock.calls[0]?.[0]).toBeUndefined();
  });

  it("rejects a wrong role with 403, not 401", () => {
    const err = run("SALES", ["SANCTION"]).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(403);
  });

  it("rejects an unauthenticated request with 401", () => {
    const err = run(undefined, ["SANCTION"]).mock.calls[0]?.[0];
    expect((err as HttpError).status).toBe(401);
  });
});
```

The 401-versus-403 pair is the whole point of this test: they are different failures and the client reacts differently to each.

- [ ] **Step 2: Run and confirm it fails**

```bash
pnpm --filter @lms/api test
```

Expected: FAIL — `./authorize` not found.

- [ ] **Step 3: Implement the middleware**

`apps/api/src/middleware/authenticate.ts`:

```ts
import type { Role } from "@lms/domain";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { HttpError } from "../lib/http-error";

export const AUTH_COOKIE = "lms_token";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(HttpError.unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(HttpError.unauthorized());
  }
}
```

`apps/api/src/middleware/authorize.ts`:

```ts
import type { Role } from "@lms/domain";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

/**
 * ADMIN is one explicit clause, mirroring checkTransition in the domain package.
 * 401 and 403 are deliberately distinct: the first means "sign in", the second
 * means "signed in, but not for this".
 */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (req.user.role === "ADMIN" || roles.includes(req.user.role)) return next();
    next(HttpError.forbidden());
  };
```

- [ ] **Step 4: Run and confirm it passes**

```bash
pnpm --filter @lms/api test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Implement the auth service**

`apps/api/src/modules/auth/auth.service.ts`:

```ts
import type { Role } from "@lms/domain";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../lib/env";

const BCRYPT_ROUNDS = 10;
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const signToken = (payload: { sub: string; role: Role }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
```

- [ ] **Step 6: Implement the controller and routes**

`apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { type LoginInput, type RegisterInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { AUTH_COOKIE } from "../../middleware/authenticate";
import { validated } from "../../middleware/validate";
import { User } from "../../models/user";
import { TOKEN_TTL_SECONDS, hashPassword, signToken, verifyPassword } from "./auth.service";

const setAuthCookie = (res: Response, token: string) =>
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });

const publicUser = (u: { _id: unknown; fullName: string; email: string; role: string }) => ({
  id: String(u._id),
  fullName: u.fullName,
  email: u.email,
  role: u.role,
});

export async function register(req: Request, res: Response) {
  const { fullName, email, password } = validated<RegisterInput>(req);
  if (await User.exists({ email })) {
    throw HttpError.conflict("EMAIL_TAKEN", "An account with this email already exists.");
  }
  const user = await User.create({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    role: "BORROWER", // self-registration never grants an executive role
  });
  setAuthCookie(res, signToken({ sub: String(user._id), role: "BORROWER" }));
  res.status(201).json(ok({ user: publicUser(user) }));
}

export async function login(req: Request, res: Response) {
  const { email, password } = validated<LoginInput>(req);
  const user = await User.findOne({ email });
  // Same message either way, so the response cannot be used to enumerate accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  setAuthCookie(res, signToken({ sub: String(user._id), role: user.role }));
  res.json(ok({ user: publicUser(user) }));
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user?.id);
  if (!user) throw HttpError.unauthorized();
  res.json(ok({ user: publicUser(user) }));
}
```

`apps/api/src/modules/auth/auth.routes.ts`:

```ts
import { loginSchema, registerSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { login, logout, me, register } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), register);
authRoutes.post("/login", validate(loginSchema), login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", authenticate, me);
```

- [ ] **Step 7: Mount the routes**

In `apps/api/src/app.ts`, add the import and mount it above `notFound`:

```ts
import { authRoutes } from "./modules/auth/auth.routes";
// ...
app.use("/api/auth", authRoutes);
```

- [ ] **Step 8: Verify the round trip manually**

```bash
pnpm --filter @lms/api dev

curl -s -c /tmp/lms.jar -X POST http://localhost:4000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"fullName":"Test User","email":"test@lms.test","password":"Password@123"}'

curl -s -b /tmp/lms.jar http://localhost:4000/api/auth/me
curl -s http://localhost:4000/api/auth/me
```

Expected: register returns `201` with `"role":"BORROWER"`; `/me` with the cookie returns the user; `/me` without the cookie returns `{"ok":false,"error":{"code":"UNAUTHENTICATED",...}}` and HTTP 401.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): add cookie auth with distinct 401 and 403 handling"
```

---

### Task 9: Seed script

**Files:**
- Create: `apps/api/src/seed/index.ts`, `apps/api/src/seed/accounts.ts`

**Interfaces:**
- Consumes: `User` model, `hashPassword`, `connectDb`, `env`
- Produces: `pnpm seed` creates one account per role, idempotently

Demo loans are seeded in Plan 3, once loan creation exists. This task covers accounts only, which is what unblocks role testing now.

- [ ] **Step 1: Define the accounts**

`apps/api/src/seed/accounts.ts`:

```ts
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
```

- [ ] **Step 2: Implement the seed runner**

`apps/api/src/seed/index.ts`:

```ts
import mongoose from "mongoose";
import { connectDb } from "../lib/db";
import { env } from "../lib/env";
import { hashPassword } from "../modules/auth/auth.service";
import { User } from "../models/user";
import { SEED_ACCOUNTS, SEED_PASSWORD } from "./accounts";

/** Upserts by email so the script can be re-run without duplicating accounts. */
async function seed() {
  await connectDb(env.MONGODB_URI);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const account of SEED_ACCOUNTS) {
    await User.updateOne(
      { email: account.email },
      { $set: { ...account, passwordHash } },
      { upsert: true },
    );
    console.log(`  ${account.role.padEnd(13)} ${account.email}`);
  }

  console.log(`\nAll accounts use the password: ${SEED_PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Run it twice to prove idempotence**

```bash
pnpm seed
pnpm seed
```

Expected: both runs print six accounts. Confirm no duplicates:

```bash
pnpm --filter @lms/api exec tsx -e "import('mongoose').then(async m=>{await m.default.connect(process.env.MONGODB_URI!);console.log(await m.default.connection.collection('users').countDocuments());await m.default.disconnect()})"
```

Expected: `6` (plus 1 if the Task 8 curl test account still exists).

- [ ] **Step 4: Verify each role can log in**

```bash
for r in admin sales sanction disbursement collection borrower; do
  printf "%-14s " "$r"
  curl -s -X POST http://localhost:4000/api/auth/login \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$r@lms.test\",\"password\":\"Password@123\"}" \
    | grep -o '"role":"[A-Z]*"'
done
```

Expected: six lines, each printing the matching role.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): add idempotent seed script for all six roles"
```

---

### Task 10: Boundary enforcement

**Files:**
- Create: `dependency-cruiser.cjs`
- Modify: `package.json` (already has the `boundaries` script from Task 1)

**Interfaces:**
- Consumes: the package layout from Tasks 2–8
- Produces: `pnpm boundaries` fails the build when an architectural rule is broken

- [ ] **Step 1: Write the config**

`dependency-cruiser.cjs`:

```js
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-stays-pure",
      comment: "packages/domain must not depend on contracts, apps, or any runtime package.",
      severity: "error",
      from: { path: "^packages/domain" },
      to: { pathNot: "^packages/domain", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "contracts-cannot-import-apps",
      severity: "error",
      from: { path: "^packages/contracts" },
      to: { path: "^apps" },
    },
    {
      name: "api-modules-cannot-cross-import",
      comment: "Sibling modules must share through domain, models, or lib — never each other.",
      severity: "error",
      from: { path: "^apps/api/src/modules/([^/]+)/" },
      to: { path: "^apps/api/src/modules/(?!$1/)[^/]+/" },
    },
    {
      name: "no-orphan-dumping-grounds",
      severity: "error",
      from: {},
      to: { path: "(^|/)(utils|helpers|misc|temp)(/|$)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["node_modules", "\\.next", "dist", "coverage"] },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
  },
};
```

The web-specific rules (`app/` may import only `features/*/public`, `ui` may not import server code) are added in Plan 3, when those folders exist. A rule pointing at a folder that does not exist yet reports nothing and creates false confidence.

- [ ] **Step 2: Run it and confirm it passes**

```bash
pnpm boundaries
```

Expected: `no dependency violations found`.

- [ ] **Step 3: Prove a rule actually bites**

Temporarily add to `packages/domain/src/index.ts`:

```ts
import { ok } from "@lms/contracts"; // deliberate violation
```

```bash
pnpm boundaries
```

Expected: FAIL on `domain-stays-pure`. **Remove the line** and re-run to confirm it passes again.

A rule nobody has seen fail is a rule nobody knows works.

- [ ] **Step 4: Run the full gate**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries
```

Expected: all four clean.

- [ ] **Step 5: Commit**

```bash
git add dependency-cruiser.cjs
git commit -m "chore: enforce architecture boundaries with dependency-cruiser"
```

---

## Definition of done for Plan 1

- [ ] `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm boundaries` all pass from the repo root
- [ ] `packages/domain` has zero entries under `dependencies`
- [ ] ~32 domain tests pass, covering both age boundaries, the exact salary threshold, all four BRE failures reported together, both interest anchors, and every legal and illegal transition
- [ ] All six seeded roles log in and receive a cookie
- [ ] `/api/auth/me` returns 401 without a cookie and the user with one
- [ ] A deliberate boundary violation has been observed failing, then removed

**Next:** Plan 2 (borrower flow — profile + BRE, salary slip upload, loan creation) and Plan 3 (dashboard modules, demo data, polish).
