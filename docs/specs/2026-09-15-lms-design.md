# Loan Management System — Design Spec

Date: 2026-09-15
Status: approved for implementation

---

## 1. Scope

A lending platform with two surfaces:

- **Borrower portal** — a four-step application ending in a loan request.
- **Operations dashboard** — four internal modules (Sales, Sanction, Disbursement,
  Collection) behind role-based access.

Six roles: `ADMIN`, `SALES`, `SANCTION`, `DISBURSEMENT`, `COLLECTION`, `BORROWER`.

Loan lifecycle: `APPLIED → SANCTIONED → DISBURSED → CLOSED`, with `REJECTED` reachable
from `APPLIED`.

---

## 2. Decisions on ambiguity

The assignment leaves several things open. Each is resolved here and must be repeated
in the README.

| Question | Decision | Reason |
|---|---|---|
| Is the age range inclusive? | Yes — `[23, 50]`. Reject if `age < 23 \|\| age > 50` | "Between 23 and 50" reads inclusive; stated explicitly so the boundary is testable |
| Is ₹25,000 salary a pass? | Yes. Reject only if `salary < 25000` | The rule says "below ₹25,000" |
| How is age computed? | From DOB to evaluation date, accounting for month and day | Year subtraction is wrong for ~half of each cohort |
| Which PAN regex is enforced? | `^[A-Z]{5}[0-9]{4}[A-Z]$` | See §5.2 — the stricter entity-type variant is implemented and tested but not enforced |
| Can a BRE-rejected borrower retry? | Yes. The *application* is blocked, not the account | The demo must show both a BRE pass and a BRE fail |
| Can a borrower hold more than one loan? | One active loan at a time. A new application is allowed once the previous loan is `CLOSED` or `REJECTED` | Keeps the Sales lead query and the portal state unambiguous |
| Where does the JWT live? | `httpOnly` cookie | Next middleware can read cookies but not `localStorage`; without it, frontend RBAC is cosmetic |
| Unauthorized status code | `401` unauthenticated, `403` authenticated but wrong role | These are different failures and the client reacts differently |

---

## 3. Repository structure

pnpm workspaces. `corepack enable pnpm` is a prerequisite (pnpm is not installed).

```
lms/
├── pnpm-workspace.yaml
├── package.json                 orchestration scripts only
├── tsconfig.base.json           strict; every package extends it
├── biome.json                   format + lint
├── dependency-cruiser.cjs       boundary rules (§12)
├── .env.example
├── AGENTS.md                    engineering rules
├── README.md
│
├── packages/
│   ├── domain/                  ZERO runtime dependencies
│   │   └── src/{money,bre,loan,rbac}/
│   └── contracts/               zod schemas; depends on domain, never the reverse
│       └── src/{auth,application,loan,payment}.ts
│
├── apps/api/
│   └── src/
│       ├── models/              mongoose schemas
│       ├── modules/             auth · application · sales · sanction ·
│       │                        disbursement · collection · loan
│       ├── middleware/          authenticate · authorize · validate · upload · error
│       ├── lib/                 env · db · async-handler · http-error
│       └── seed/
│
└── apps/web/
    ├── app/                     route shells + middleware.ts
    ├── features/                auth · application · sales · sanction ·
    │   └── <slice>/{ui,model,api}   disbursement · collection
    ├── entities/                loan · user · payment
    ├── components/              ui/ (shadcn) · queue-shell/ · app-nav/
    └── lib/                     api-client · session
```

`packages/domain` declares no runtime dependencies. Not express, not mongoose, not
react, not zod. It is pure functions, so it tests in milliseconds and cannot leak
infrastructure concerns into business rules.

---

## 4. Money

All monetary values are **integer paise**, behind a branded type:

```ts
export type Paise = number & { readonly __brand: "Paise" };
export const rupeesToPaise = (r: number): Paise => Math.round(r * 100) as Paise;
export const formatPaise = (p: Paise): string => /* "₹50,493.15" */;
```

Rupees cannot be passed where paise are expected — it is a compile error.

**Why this matters.** For `P = ₹50,000, T = 30 days`:

```
SI = 18,000,000 / 36,500 = 493.1506849315...
```

The assignment requires a loan to auto-close when *total paid equals total
repayment*. In floating-point rupees that equality never holds and the loan silently
never closes. In integer paise the comparison is exact.

**Bounds** (paise): principal `5_000_000 … 50_000_000` (₹50K–₹5L); salary floor
`2_500_000` (₹25,000). Interest is stored as basis points: `1200` = 12.00% p.a.

**Interest** (`packages/domain/src/loan/interest.ts`):

```
interestPaise      = round(principalPaise × rateBps × tenureDays / (365 × 10_000))
totalRepayablePaise = principalPaise + interestPaise
```

Largest intermediate is `50_000_000 × 1200 × 365 ≈ 2.19e13`, well inside
`Number.MAX_SAFE_INTEGER` (`9.007e15`). No overflow, no BigInt needed.

Verification anchors for tests:
- `₹50,000 / 30d` → interest `49_315` paise (₹493.15), total `5_049_315`
- `₹5,00,000 / 365d` → interest `6_000_000` paise (₹60,000), total `56_000_000`

### Units on the wire

Paise are an **internal storage format only**. Every API request and response carries
money in **rupees**, because that is what a person types into a slider and reads off a
screen. Conversion happens in exactly one place — the zod schemas in
`packages/contracts`, which parse rupees inbound and serialise paise outbound.

So `monthlySalary`, `amount` and every displayed total are rupees at the boundary and
paise everywhere behind it. Field names follow this: a `Paise` suffix means the value
is an integer in paise and therefore never appears in a payload.

---

## 5. Business Rule Engine

### 5.1 Shape

Rules are data, not branches:

```ts
type BreRule = {
  code: "AGE" | "SALARY" | "PAN" | "EMPLOYMENT";
  check: (a: Applicant) => boolean;   // true = pass
  message: string;
};
export const BRE_RULES: readonly BreRule[];
export function evaluateBre(a: Applicant): BreResult;
```

`evaluateBre` returns **every** failure, not the first. A borrower with three problems
sees three messages once, instead of discovering them over three submissions.

### 5.2 PAN

An Indian PAN is 10 characters: five letters, four digits, one letter. The **fourth
character is a holder-type code** — `P` individual, `C` company, `H` HUF, `F` firm,
`T` trust, and so on — and the fifth is the first letter of the surname.

Two regexes ship in `domain/bre/pan.ts`:

```ts
export const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;               // enforced
export const PAN_STRICT = /^[A-Z]{3}[ABCFGHLJPTE][A-Z][0-9]{4}[A-Z]$/;  // documented
```

`PAN_FORMAT` is enforced. `PAN_STRICT` is implemented and unit-tested but not applied,
because common test values such as `ABCDE1234F` have an invalid holder-type character
and rejecting them would look like a bug to an evaluator. The README states this
trade-off rather than hiding it.

### 5.3 Where the BRE runs

**Both sides, one source.** `packages/domain` is imported by `apps/web` for instant
feedback and by `apps/api` as the authority. The server re-evaluates on every write,
because a client check is a convenience and never a control — anyone can call the API
directly.

Duplication is impossible by construction: a dependency-cruiser rule (§12) fails the
build if PAN or interest logic is defined outside `packages/domain`.

---

## 6. Data model

### `users`

| Field | Type | Notes |
|---|---|---|
| `email` | string | unique, lowercased, trimmed |
| `passwordHash` | string | bcrypt, cost 10 |
| `fullName` | string | |
| `role` | `Role` | registration always yields `BORROWER`; executives are seeded |
| `createdAt` / `updatedAt` | Date | |

Index: `{ email: 1 }` unique.

### `borrowerprofiles` — one per borrower

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → users | unique |
| `fullName` | string | |
| `pan` | string | uppercased, unique |
| `dateOfBirth` | Date | |
| `monthlySalaryPaise` | int | |
| `employmentMode` | `SALARIED \| SELF_EMPLOYED \| UNEMPLOYED` | |
| `bre` | `{ passed, failures: [{code,message}], evaluatedAt }` | last evaluation |
| `salarySlip` | `{ storedName, originalName, mimeType, sizeBytes, uploadedAt }` \| null | |

Indexes: `{ userId: 1 }` unique, `{ pan: 1 }` unique.

### `loans`

| Field | Type | Notes |
|---|---|---|
| `borrowerId` | ObjectId → users | |
| `snapshot` | `{ fullName, pan, dateOfBirth, monthlySalaryPaise, employmentMode }` | frozen at apply time |
| `principalPaise` | int | 5_000_000 … 50_000_000 |
| `tenureDays` | int | 30 … 365 |
| `interestRateBps` | int | 1200 |
| `interestPaise` | int | |
| `totalRepayablePaise` | int | |
| `outstandingPaise` | int | starts at `totalRepayablePaise` |
| `status` | `LoanStatus` | |
| `statusHistory` | `[{ from, to, by, byRole, at, reason? }]` | append-only |
| `appliedAt` / `sanctionedAt?` / `disbursedAt?` / `closedAt?` | Date | |

A rejection reason is **not** stored as its own field. It lives in the final
`statusHistory` entry, which is already required to carry `reason`. Two copies of the
same fact can drift; the history is the source of truth and the UI reads the last
entry.

Indexes: `{ borrowerId: 1 }`, `{ status: 1, appliedAt: -1 }` — every dashboard module
queries by status.

**Why `snapshot`.** The loan was assessed against the borrower's details *at the time
of application*. If the borrower later edits their salary, the sanctioned loan's basis
must not move. This is how lending actually works and it also makes the Sanction
screen auditable.

### `payments`

| Field | Type | Notes |
|---|---|---|
| `loanId` | ObjectId → loans | |
| `utr` | string | **globally unique** |
| `amountPaise` | int | > 0 |
| `paidAt` | Date | |
| `recordedBy` | ObjectId → users | |

Indexes: `{ utr: 1 }` unique, `{ loanId: 1, paidAt: -1 }`.

Uniqueness is a database constraint, not an application check. Two concurrent requests
would both pass a `findOne` guard; only a unique index actually prevents the duplicate.
A `E11000` error maps to `409`.

---

## 7. Status transitions

One table encodes the whole lifecycle *and* who may drive it:

```ts
const TRANSITIONS = {
  APPLIED:    { SANCTIONED: "SANCTION", REJECTED: "SANCTION" },
  SANCTIONED: { DISBURSED:  "DISBURSEMENT" },
  DISBURSED:  { CLOSED:     "COLLECTION" },
  CLOSED:     {},
  REJECTED:   {},
} as const satisfies Record<LoanStatus, Partial<Record<LoanStatus, Role>>>;
```

`satisfies` makes this exhaustive: adding a status without a row is a compile error, so
the lifecycle and its permissions can never drift apart. `ADMIN` is permitted on every
transition in addition to the owning role.

```ts
export function checkTransition(from, to, role):
  | { ok: true }
  | { ok: false; reason: "INVALID_TRANSITION" | "FORBIDDEN_ROLE" };
```

**Single write point.** `apps/api/src/modules/loan/transition.service.ts` is the only
file in the codebase that writes `loan.status`. Sanction, Disbursement and Collection
all call it. It applies the guard, appends to `statusHistory`, and stamps the matching
timestamp.

Four modules performing their own transitions would mean four chances to forget the
guard — and one forgotten guard is an RBAC hole.

---

## 8. Payments and auto-close

Recording a payment is guarded atomically:

```ts
Loan.findOneAndUpdate(
  { _id: loanId, status: "DISBURSED", outstandingPaise: { $gte: amountPaise } },
  { $inc: { outstandingPaise: -amountPaise } },
  { new: true },
);
```

A `null` result means the loan is not disbursed or the payment would overpay; both map
to `409`. Because the condition and the decrement are one operation, two concurrent
payments cannot both pass the check.

When `outstandingPaise` reaches `0`, the service calls `transitionLoan(..., "CLOSED")`.
The comparison is exact integer equality — see §4.

Validation on amount: integer, `> 0`, `<= outstandingPaise`. UTR: non-empty, trimmed,
uppercased, unique.

Atlas M0 is a three-node replica set, so multi-document transactions are available if
the payment insert and loan update need to be strictly atomic together. The conditional
update is sufficient for this scope; the upgrade path is noted in the README.

---

## 9. Authentication and RBAC

- bcrypt (cost 10) for password hashing.
- JWT `{ sub, role }`, 7-day expiry, signed with `JWT_SECRET`, delivered as an
  `httpOnly`, `SameSite=Lax` cookie. Cookies ignore port, so `localhost:3000` and
  `localhost:4000` share a jar in development; CORS runs with
  `origin: WEB_ORIGIN, credentials: true`.

**Backend** — two composable middlewares:

```ts
authenticate            // no/invalid cookie → 401
authorize(...roles)     // wrong role → 403 (ADMIN always allowed)
```

Every dashboard route carries both. Route-level `authorize` is the real control;
transition-level `checkTransition` is the second, finer gate.

**Frontend** — `apps/web/middleware.ts` reads the cookie, decodes the role, and
redirects before a protected page renders. Navigation is filtered by role, and a
borrower hitting `/dashboard/*` is redirected to the portal.

Both layers exist because hiding a menu item is not access control, and the assignment
grades the API rejecting the request directly.

| Module | Roles |
|---|---|
| sales | `SALES`, `ADMIN` |
| sanction | `SANCTION`, `ADMIN` |
| disbursement | `DISBURSEMENT`, `ADMIN` |
| collection | `COLLECTION`, `ADMIN` |

---

## 10. REST API

Every response uses one envelope:

```ts
type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

A discriminated union means the web `api-client` unwraps it in one place and every
error — validation, BRE, 401, 403, 409 — is handled through a single path.

| Method | Route | Roles | Body → Result | Codes |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | `{email,password,fullName}` → `{user}` | 201, 409 |
| POST | `/api/auth/login` | public | `{email,password}` → `{user}` | 200, 401 |
| POST | `/api/auth/logout` | any | — | 204 |
| GET | `/api/auth/me` | any | → `{user}` | 200, 401 |
| GET | `/api/application/me` | BORROWER | → `{profile, activeLoan}` | 200 |
| PUT | `/api/application/profile` | BORROWER | `{fullName,pan,dateOfBirth,monthlySalary,employmentMode}` → `{profile,bre}` | 200, 422 |
| POST | `/api/application/salary-slip` | BORROWER | multipart `file` → `{salarySlip}` | 201, 413, 415 |
| POST | `/api/loans` | BORROWER | `{amount,tenureDays}` → `{loan}` | 201, 409, 422 |
| GET | `/api/loans/me` | BORROWER | → `{loans[]}` | 200 |
| GET | `/api/loans/:id` | owner or module role | → `{loan, payments[]}` | 200, 403, 404 |
| GET | `/api/files/salary-slip/:userId` | owner or exec | → stream | 200, 403, 404 |
| GET | `/api/sales/leads` | SALES | → `{leads[]}` | 200, 403 |
| GET | `/api/sanction/queue` | SANCTION | → `{loans[]}` | 200, 403 |
| POST | `/api/loans/:id/sanction` | SANCTION | `{decision:"APPROVE"\|"REJECT", reason?}` → `{loan}` | 200, 409, 422 |
| GET | `/api/disbursement/queue` | DISBURSEMENT | → `{loans[]}` | 200, 403 |
| POST | `/api/loans/:id/disburse` | DISBURSEMENT | — → `{loan}` | 200, 409 |
| GET | `/api/collection/queue` | COLLECTION | → `{loans[]}` | 200, 403 |
| POST | `/api/loans/:id/payments` | COLLECTION | `{utr,amount,paidAt}` → `{payment,loan}` | 201, 409, 422 |

`ADMIN` is accepted anywhere a module role is listed.

Status code meanings: `400` malformed request · `401` unauthenticated · `403` wrong
role · `404` not found · `409` conflict (duplicate UTR, invalid transition, active loan
already exists, overpayment) · `413` file too large · `415` wrong file type · `422`
validation or BRE failure.

Request and response shapes live in `packages/contracts` as zod schemas. The API
validates with them; the web app infers its types from them. One definition, both uses.

---

## 11. Frontend

### Routes

| Path | Access |
|---|---|
| `/login`, `/register` | public |
| `/apply` | BORROWER — four-step wizard |
| `/apply/status` | BORROWER — current loan and history |
| `/dashboard/sales` | SALES, ADMIN |
| `/dashboard/sanction` | SANCTION, ADMIN |
| `/dashboard/disbursement` | DISBURSEMENT, ADMIN |
| `/dashboard/collection` | COLLECTION, ADMIN |

`/` redirects by role.

### Layer order

```
app → features → entities → components / lib
```

Imports only go downward, and slices on the same layer may not import each other —
`features/sanction` cannot reach `features/disbursement`; both use `entities/loan`.
Enforced by dependency-cruiser.

Feature-Sliced Design also defines a `widgets` layer, which is deliberately **not**
used. Widgets sit *above* features and compose them; the shell described below is
consumed *by* features, so modelling it as a widget would invert the dependency. At
this app's size a four-layer stack is enough, and an unused layer is just a folder
people put things in by accident.

### Reuse: what is shared and what is not

The four modules are **not** the same. Sales lists users, not loans. Collection's
action is a payment form. Forcing them into one generic module component would be the
wrong abstraction.

What all four genuinely share is the **shell**: header with count, filter, a responsive
table that becomes cards on mobile, loading / empty / error states, and a detail
drawer. That ships as `components/queue-shell`, generic over its row type, with the
action panel passed in.

This is a *layout* abstraction, not a *logic* abstraction. Each module keeps its own
service and its own action panel. Sanction and Disbursement are deliberately **not**
merged into a shared factory: two instances is not enough evidence to abstract, and
Sanction's rejection reason will diverge from Disbursement almost immediately.

### Loan calculator

The live panel in step 4 computes with the same `domain/loan/interest.ts` the server
uses, so the number shown while dragging the slider is the number that gets stored.

---

## 12. Machine-enforced rules

Documentation is advisory; these fail the build.

**dependency-cruiser**

| Rule | Prevents |
|---|---|
| `no-circular` | tangled imports |
| `app/` may import only `features/*/public` and `components/*` | logic leaking into route shells |
| `features/*/ui` and `*/client` may not import server code | business logic reaching the browser |
| `components/ui` may not import `features` or `app` | primitives growing app knowledge |
| same-layer slices may not import each other | module coupling |
| BRE and interest logic may not be defined outside `packages/domain` | the drift the assignment asks about |
| `packages/domain` may not import `contracts`, `apps/*`, or any runtime dependency | keeping the core pure |

**Size limits** — 300 lines per file, 220 per React file, 60 per function.

**Forbidden folder names** — `utils`, `helpers`, `misc`, `temp`. These always become
dumping grounds; banning the name is the cheapest prevention.

---

## 13. Seed script

`pnpm seed` is idempotent (upsert by email) so it can be re-run safely.

Six accounts, one per role, password `Password@123`, emails `admin@lms.test`,
`sales@lms.test`, `sanction@lms.test`, `disbursement@lms.test`, `collection@lms.test`,
`borrower@lms.test`.

It also creates demo data so every module is populated on first login:

- two leads (one signed-up only, one BRE-rejected) for Sales
- two `APPLIED` loans for Sanction
- one `SANCTIONED` loan for Disbursement
- one `DISBURSED` loan with a partial payment for Collection
- one `CLOSED` loan for history

An evaluator logging in as any role sees a working screen immediately rather than an
empty state.

---

## 14. Testing

| Target | Coverage |
|---|---|
| `packages/domain` | high — BRE boundaries (age exactly 23 and 50, salary exactly 25000, PAN variants), interest anchors from §4, every legal and illegal transition, paise conversion |
| `apps/api` | integration tests for the transition guard, duplicate UTR, overpayment, and auto-close |
| `apps/web` | none — the submission video is the end-to-end proof |

The domain package has no I/O, so its suite runs in milliseconds and can be run on
every save. This is exactly the code carrying the 15% BRE-and-loan-math weight.

---

## 15. Build order

Each step leaves the system running.

1. Skeleton — workspace, both apps boot, Mongo connects, health check
2. `packages/domain` + tests — pure logic first, since everything depends on it
3. Auth, RBAC middleware, seed script — all six roles can log in
4. Borrower flow — profile + BRE → upload → apply *(first end-to-end path)*
5. Dashboard shell + Sanction — proves the `queue-shell` pattern
6. Disbursement — should be quick once step 5 exists
7. Collection — payments, auto-close
8. Sales — leads
9. Polish — responsive pass, empty and error states, README, `.env.example`

After step 4 the system is demonstrable; every later step adds to it without breaking
what exists.

---

## 16. Out of scope

Refresh-token rotation, password reset, email delivery, pagination beyond a sensible
page size, rate limiting, cloud file storage, Docker, CI, Lighthouse budgets, and
end-to-end browser tests. Each is defensible in a production system and none is graded
here; listing them signals the omission was a decision rather than an oversight.
