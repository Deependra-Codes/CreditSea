# Loan Management System

A lending platform with two surfaces: a four-step borrower portal that ends in a loan application, and an operations dashboard whose four modules — Sales, Sanction, Disbursement, Collection — each move the loan through one stage of its life, behind role-based access.

**Stack** — Next.js (App Router) · TypeScript · Tailwind CSS v4 · Express 5 · MongoDB + Mongoose · JWT + bcrypt, in a pnpm workspace.

---

## Run it

**Prerequisites:** Node ≥ 20.9 and a MongoDB connection string. A free [Atlas](https://www.mongodb.com/cloud/atlas/register) M0 cluster is enough — after creating it, open **Network Access → Add Current IP**, or the connection will simply time out.

```bash
corepack enable pnpm          # pnpm ships with Node; this switches it on
pnpm install

cp .env.example apps/api/.env # then edit MONGODB_URI and JWT_SECRET
pnpm seed                     # creates indexes, six role accounts, and demo data
pnpm dev                      # API on :4000, web on :3000
```

Open **http://localhost:3000**.

The web app defaults to `http://localhost:4000` for the API, so it needs no env file of its own. Override it with `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` if you move the API.

`pnpm seed` is idempotent — re-run it any time to reset the demo data.

---

## Credentials

Every account uses the password **`Password@123`**. They are also one click away: the sign-in screen has a **Demo accounts** panel that fills the form for you.

| Role | Email | What they can do |
|---|---|---|
| Borrower | `borrower@lms.test` | Apply for a loan and track it. Seeded empty, so the wizard starts from step 1 |
| Sales | `sales@lms.test` | See registered borrowers and their funnel stage |
| Sanction | `sanction@lms.test` | Approve or reject applied loans |
| Disbursement | `disbursement@lms.test` | Release funds on sanctioned loans |
| Collection | `collection@lms.test` | Record payments until a loan settles |
| Admin | `admin@lms.test` | All four modules |

Nine further demo borrowers are seeded across every stage, so each module opens with real content rather than an empty table.

---

## What to look at first

1. **Sign in as the borrower** and complete the wizard. On step 2, enter date of birth `2010-01-01`, salary `9000`, employment `Unemployed` — three rules go red **at once**, and the details are still saved so you can correct them in place. Fix them and the step advances.
2. **On step 3**, rename a PNG to `.pdf` and upload it. The server reads its magic bytes and refuses it.
3. **On step 4**, drag the sliders. At ₹50,000 over 30 days the interest reads **₹493.15** — the same figure the API stores, computed by the same function.
4. **Sign in as sanction**, approve the loan. Then **disbursement** releases it, and **collection** records a payment. Pay the exact outstanding balance and the loan closes itself.
5. **Try the wrong module**: as `disbursement@lms.test`, open `/dashboard/sanction`. The nav does not offer it, and the API returns 403 if you ask anyway.

---

## The questions the brief asked

### What is the correct PAN regex?

An Indian PAN is ten characters: five letters, four digits, one letter. The **fourth character is a holder-type code** — `P` individual, `C` company, `H` HUF, `F` firm, `T` trust, and so on — and the fifth is the first letter of the surname. Two patterns ship in [`packages/domain/src/bre/pan.ts`](packages/domain/src/bre/pan.ts):

```ts
export const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;                   // enforced
export const PAN_STRICT = /^[A-Z]{3}[ABCFGHLJPTE][A-Z][0-9]{4}[A-Z]$/; // documented
```

`PAN_FORMAT` is the one applied. `PAN_STRICT` is implemented and unit-tested but deliberately not enforced: widely-used test values such as `ABCDE1234F` carry an invalid holder-type character, and rejecting them reads as a bug to anyone trying the system. A test asserts `ABCDE1234F` passes, so swapping the stricter pattern in fails CI and explains itself.

### Should the BRE live on the client, the server, or both?

**Both, from one source.** The server is the authority and re-evaluates on every write, because a client check is a convenience and never a control — anyone can call the API directly. The client evaluates too, so the applicant sees the verdict resolve as they type.

Running the same rules in two places invites drift, so they are not written twice: [`packages/domain`](packages/domain) holds them, both apps import it, and a dependency-cruiser rule fails the build if that package is imported by anything it should not be, or imports anything itself. The package declares **zero runtime dependencies**.

The rules are data rather than branches, and `evaluateBre` returns **every** failure rather than the first — an applicant with three problems learns all three now, instead of across three submissions. See [`evaluate.ts`](packages/domain/src/bre/evaluate.ts).

### What status transitions happen at sanction? What comes after disbursement?

One table carries the whole lifecycle *and* who may drive each move ([`transitions.ts`](packages/domain/src/loan/transitions.ts)):

```ts
const TRANSITIONS = {
  APPLIED:    { SANCTIONED: "SANCTION", REJECTED: "SANCTION" },
  SANCTIONED: { DISBURSED:  "DISBURSEMENT" },
  DISBURSED:  { CLOSED:     "COLLECTION" },
  CLOSED:     {},
  REJECTED:   {},
} as const satisfies Record<LoanStatus, Partial<Record<LoanStatus, Role>>>;
```

`satisfies` makes it exhaustive: adding a status without a row is a compile error, so the lifecycle and its permissions cannot drift apart. `ADMIN` is permitted in addition to the owning role, as one explicit clause rather than an exception scattered through the code — and it widens *who* may act, never *what* is legal, so a skipped stage stays illegal for everyone.

[`workflows/transition.service.ts`](apps/api/src/workflows/transition.service.ts) is the only code in the repo that changes `loan.status`. It writes conditional on the status it observed, so two concurrent sanctions cannot both succeed; the second gets `409 CONCURRENT_UPDATE`.

### How is the outstanding balance tracked, and what validates a payment?

`outstandingPaise` is stored on the loan and decremented, rather than summed from payments on every read. The decrement is **conditional and atomic**, so two concurrent payments cannot both pass the check:

```ts
Loan.findOneAndUpdate(
  { _id: loanId, status: "DISBURSED", outstandingPaise: { $gte: amountPaise } },
  { $inc: { outstandingPaise: -amountPaise } },
  { new: true, session },
);
```

A `null` result means the loan is not open for payment or the amount exceeds the balance — both are `409`.

Validation: the amount is a positive number within the loan's remaining balance; the UTR is 6–32 characters, uppercased, and **unique across every payment via a database index**, not an application check, because a `findOne` guard cannot stop two concurrent requests from both passing it. A duplicate returns `409 UTR_ALREADY_RECORDED`.

The insert, the decrement, and the resulting close run in **one transaction** ([`collection/service.ts`](apps/api/src/modules/collection/service.ts)). Without it, a duplicate UTR — an expected rejection in this system, not a rare accident — could leave a balance claiming money arrived with no payment behind it.

When `outstandingPaise` reaches exactly `0`, the loan closes itself. That equality holds because **money is stored as integer paise**; in floating-point rupees, ₹50,000 over 30 days owes `493.1506849…` and the comparison would never land.

### How are roles stored and checked, and what status code for unauthorized?

The role is a field on the user, constrained to the `Role` union the domain exports. Two composable middlewares guard every route ([`authorize.ts`](apps/api/src/middleware/authorize.ts)):

```ts
router.use(authenticate, authorize(...MODULE_ROLES.sanction));
```

Guards sit on the **router**, not on individual routes, so a new route cannot be added unguarded by accident.

- **`401`** — not authenticated. No cookie, or a cookie that fails verification.
- **`403`** — authenticated, but the wrong role.

These are different failures and the client reacts differently to each, which is why they are not collapsed into one.

Enforcement is on both sides, as the brief requires. On the frontend, [`apps/web/middleware.ts`](apps/web/middleware.ts) reads the auth cookie and redirects before a protected page renders — which is why the token lives in an `httpOnly` cookie rather than `localStorage`, since Next middleware can read one and not the other. That middleware decodes the role **without verifying the signature**, deliberately and with the reasoning at the call site: it chooses a destination, it does not grant access. A forged cookie buys a rendered shell whose every data call returns 401.

---

## Architecture

```
packages/domain      business rules — ZERO runtime dependencies
packages/contracts   zod schemas; the one rupees ↔ paise boundary
apps/api             Express 5 · Mongoose · modules, workflows, middleware
apps/web             Next.js App Router · route shells, feature slices, primitives
```

`packages/domain` is the centre. It has no `dependencies` at all — not express, not mongoose, not react, not zod — so it tests in milliseconds and cannot leak infrastructure into business rules. Both apps import it, which is what makes "the same rule on both sides" true rather than aspirational.

**Rules that are enforced by the build, not by convention** (`pnpm boundaries`):

| Rule | Prevents |
|---|---|
| `packages/domain` imports nothing outside itself | business rules acquiring dependencies |
| API modules may not import each other | modules coupling instead of sharing through `workflows/` |
| `app/` may import only `features/*/public` | logic leaking into route shells |
| feature slices may not import each other | the same coupling on the web side |
| `components/` may not import `features/` or `app/` | primitives growing app knowledge |
| no folder named `utils`, `helpers`, `misc`, `temp` | dumping grounds |
| no circular imports | spaghetti |

Each of these has been observed failing on a deliberate violation and then restored — a rule nobody has seen fail is a rule nobody knows works.

The full data model, REST contract and status machine are in [`docs/architecture.md`](docs/architecture.md). The implementation plans are in [`docs/plans/`](docs/plans).

### Response envelope

Every response uses one shape, so the web client unwraps it in a single place and every failure — validation, BRE, 401, 403, 409 — is handled through one path:

```ts
type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

Responses are produced by a mapper beside each model, so internal fields never leak — `activeBorrowerId`, which enforces the one-active-loan index, is nobody's business outside the database.

---

## Decisions and trade-offs

**Money is integer paise.** Rupees cross the wire because that is what a person types; paise is what is stored. Conversion happens only in `packages/contracts`. A `Paise` branded type makes passing rupees where paise are expected a compile error. Without this, auto-close silently never fires.

**A BRE rejection returns `200`, not `422`.** The request was well formed and the profile was saved. `422` means *nothing was stored*; a rejection means *stored, and you are not eligible yet* — which is what lets an applicant correct their details and retry, as the brief requires.

**One active loan per borrower is a database guarantee.** A partial unique index on `activeBorrowerId`, not a `findOne` check that two concurrent applications would both pass.

**No component library.** The portal needs text inputs, a file input, two range sliders and a stepper; a native `<input type="range">` is keyboard-accessible and labelled for free. The dashboard detail expands the row in place rather than opening a modal, so no focus trap is needed either. The dependency was considered twice and was not earned.

**Testing is selective.** High coverage on `packages/domain`, where the graded logic lives and where tests run in milliseconds with no I/O. No web tests — the recording is the end-to-end proof. See below.

---

## Known limitations

Each of these is a decision, not an oversight.

- **JWT role staleness.** The token carries `{ sub, role }` for seven days, so a role changed in the database would not take effect until it expires. Acceptable only because roles are seeded and the system has no role-change feature; a real system would look the role up per request or keep tokens short with rotation.
- **No refresh-token rotation, no password reset, no email.**
- **Uploads go to local disk**, served through an authenticated route — never a static directory, since possession of a URL would otherwise be enough to read a stranger's salary slip. Production would use object storage.
- **No pagination.** Queues load in full, which is right at demo scale and wrong beyond it.
- **No rate limiting** on authentication.
- **An unknown dashboard section answers 200, not 404.** The 404 page renders correctly, but `loading.tsx` opens a Suspense boundary and the response has already begun streaming by the time `notFound()` runs, so the status is fixed. Correcting it means giving up the streamed loading state for every module, which is a poor trade for a URL nobody reaches by accident.

---

## Testing

```bash
pnpm test        # 96 tests
pnpm typecheck   # strict, with noUncheckedIndexedAccess and exactOptionalPropertyTypes
pnpm lint        # Biome
pnpm boundaries  # architecture rules
```

| Target | Coverage |
|---|---|
| `packages/domain` | Both age boundaries at exactly 23 and 50, the salary threshold at exactly ₹25,000, PAN variants, the float traps in paise conversion, both interest anchors, every legal and illegal transition, and the loan visibility clauses |
| `apps/api` | The 401/403 split, forged and expired tokens, the duplicate-key mapping, the validation envelope, magic-byte upload rejection, and a malformed id answering 404 rather than casting |
| `apps/api` workflows | The two places money moves: that a transition writes conditional on the status it observed, that a duplicate UTR is refused before the balance is touched, and that the loan closes at exactly zero. Each suite was run against deliberately broken code to confirm it fails |
| `apps/web` | None — deliberately. The recording is the end-to-end proof |

Behaviour that needs a live database — the concurrent-transition guard, duplicate UTR, overpayment rollback, auto-close — was verified against Atlas and is scripted in [`docs/demo-script.md`](docs/demo-script.md).
