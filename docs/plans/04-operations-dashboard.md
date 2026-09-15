# Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the loan lifecycle. Sanction approves or rejects, Disbursement releases funds, Collection records payments until the loan closes itself, and Sales works the pre-application funnel — each behind its own role.

**Architecture:** One transition service in `apps/api/src/workflows/` is the only code that writes `loan.status`; the three acting modules call it. Payments run inside a MongoDB transaction so the insert, the balance decrement and any resulting close commit together. On the web, one queue shell carries the four modules' shared layout while each keeps its own action panel.

**Tech Stack:** Express 5 · Mongoose 8 transactions · Next.js App Router · vitest

**Spec:** `docs/architecture.md`

**Preceded by:** plans 01–03

## Global Constraints

Plans 01–03 still apply. In addition:

- `loan.status` is written in exactly one file. Any other write is a bug.
- Every transition is conditional on the status the caller observed, so two concurrent actions cannot both succeed.
- `transitionLoan` takes its session as a **required** parameter. An optional session is a session someone forgets to pass, and a mongoose query without one commits outside the transaction.
- Payments: insert first, then decrement. A duplicate UTR then fails before the balance moves.
- Status is never colour alone; every pill carries its name.

---

## The shadcn/ui decision, resolved

Plan 03 deferred this to here, on the grounds that a detail drawer needs a real focus trap and that is where a component library earns its place.

Working through the screen changed the premise. A queue is worked one row at a time, so the detail does not need to be a modal at all — expanding the row in place shows the same information, keeps the queue visible for context, needs no focus trap, no scroll lock, and no dismissal semantics, and behaves correctly on a phone without a second layout.

So the answer is not "add the dependency" but "pick the pattern that does not need it". No shadcn/ui in this project.

---

### Task 1: The transition workflow

**Files:**
- Create: `apps/api/src/lib/transaction.ts`, `apps/api/src/workflows/transition.service.ts`
- Test: `apps/api/src/workflows/transition.service.test.ts`

**Interfaces:**
- Produces:
  - `withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>`
  - `transitionLoan(args: { loanId, to, actor, reason?, session }): Promise<LoanDoc>`

- [ ] **Step 1: The session helper**

```ts
import mongoose, { type ClientSession } from "mongoose";

/** Atlas is a replica set, so transactions are available. */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
```

- [ ] **Step 2: The transition service**

```ts
import { STATUS_TIMESTAMP, checkTransition, type LoanStatus, type Role } from "@lms/domain";
import type { ClientSession } from "mongoose";
import { HttpError } from "../lib/http-error";
import { Loan, type LoanDoc } from "../models/loan";

type TransitionArgs = {
  loanId: string;
  to: LoanStatus;
  actor: { id: string; role: Role };
  reason?: string;
  session: ClientSession; // required: an optional one is one someone forgets
};

/** The only place in the codebase that writes loan.status. */
export async function transitionLoan(args: TransitionArgs): Promise<LoanDoc> {
  const { loanId, to, actor, reason, session } = args;

  const loan = await Loan.findById(loanId).session(session);
  if (!loan) throw HttpError.notFound("Loan");

  const check = checkTransition(loan.status, to, actor.role);
  if (!check.ok) {
    throw check.reason === "FORBIDDEN_ROLE"
      ? HttpError.forbidden()
      : HttpError.conflict("INVALID_TRANSITION", `A ${loan.status.toLowerCase()} loan cannot be ${to.toLowerCase()}.`);
  }

  const now = new Date();
  const from = loan.status;

  // The observed status is part of the query, not just of the check above —
  // otherwise two concurrent sanctions both read APPLIED and both write.
  const updated = await Loan.findOneAndUpdate(
    { _id: loanId, status: from },
    {
      $set: {
        status: to,
        [STATUS_TIMESTAMP[to]]: now,
        ...(to === "CLOSED" || to === "REJECTED" ? {} : {}),
      },
      $push: { statusHistory: { from, to, by: actor.id, byRole: actor.role, at: now, ...(reason ? { reason } : {}) } },
      // A loan that is no longer active releases the borrower's slot.
      ...(to === "CLOSED" || to === "REJECTED" ? { $unset: { activeBorrowerId: "" } } : {}),
    },
    { new: true, session },
  );

  if (!updated) {
    throw HttpError.conflict("CONCURRENT_UPDATE", "Someone else moved this loan. Reload and try again.");
  }
  return updated;
}
```

- [ ] **Step 3: Test the guard against a real database**

Integration tests need Mongo. Use `mongodb-memory-server` as a devDependency of `apps/api` so the suite runs without credentials and without touching the shared cluster.

Cover: a legal transition succeeds and appends history; the wrong role gets 403; a skipped stage gets 409; a second concurrent transition from the same observed status gets `CONCURRENT_UPDATE`; `CLOSED` and `REJECTED` unset `activeBorrowerId`.

- [ ] **Step 4: Commit**

---

### Task 2: Sanction and Disbursement modules

Deliberately two modules with their own services, not one factory. Two instances is not enough evidence to abstract, and Sanction's rejection reason will diverge from Disbursement almost immediately.

**Files:**
- Create: `apps/api/src/modules/sanction/{service,controller,routes}.ts`
- Create: `apps/api/src/modules/disbursement/{service,controller,routes}.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- `GET /api/sanction/queue` → loans in `APPLIED` (SANCTION, ADMIN)
- `POST /api/loans/:id/sanction` `{ decision, reason? }` (SANCTION, ADMIN)
- `GET /api/disbursement/queue` → loans in `SANCTIONED` (DISBURSEMENT, ADMIN)
- `POST /api/loans/:id/disburse` (DISBURSEMENT, ADMIN)

Each queue reads `QUEUE_STATUS[role]` from the domain rather than naming a status inline, so the queue and the lifecycle cannot drift.

- [ ] **Step 1** Sanction service: `withTransaction` wrapping one `transitionLoan` to `SANCTIONED` or `REJECTED`.
- [ ] **Step 2** Disbursement service: the same shape to `DISBURSED`.
- [ ] **Step 3** Controllers and routes, each guarded by `authenticate` + `authorize`.
- [ ] **Step 4** Verify: sanction executive approves; disbursement executive is refused on the same route with 403; approving twice returns 409.
- [ ] **Step 5** Commit.

---

### Task 3: Collection, payments and auto-close

**Files:**
- Create: `apps/api/src/modules/collection/{service,controller,routes}.ts`
- Test: `apps/api/src/modules/collection/service.test.ts`

**Interfaces:**
- `GET /api/collection/queue` → loans in `DISBURSED`
- `POST /api/loans/:id/payments` `{ utr, amount, paidAt }` → `{ payment, loan }`

- [ ] **Step 1: The service**

```ts
export async function recordPayment(loanId: string, input: PaymentInput, actor: Actor) {
  return withTransaction(async (session) => {
    // Insert first: a duplicate UTR then fails before the balance moves.
    const [payment] = await Payment.create(
      [{ loanId, utr: input.utr, amountPaise: input.amount, paidAt: input.paidAt, recordedBy: actor.id }],
      { session },
    );

    const loan = await Loan.findOneAndUpdate(
      { _id: loanId, status: "DISBURSED", outstandingPaise: { $gte: input.amount } },
      { $inc: { outstandingPaise: -input.amount } },
      { new: true, session },
    );
    if (!loan) {
      throw HttpError.conflict("PAYMENT_REFUSED", "This loan is not open for payment, or the amount exceeds what is outstanding.");
    }

    // Exact integer equality — see architecture §4 for why this holds.
    const closed = loan.outstandingPaise === 0
      ? await transitionLoan({ loanId, to: "CLOSED", actor, session })
      : loan;

    return { payment, loan: closed };
  });
}
```

- [ ] **Step 2: Tests that matter**

Against `mongodb-memory-server`: a partial payment leaves the loan `DISBURSED` with the balance reduced; a payment equal to the outstanding closes it; an overpayment is refused and **the payment row is rolled back**; a duplicate UTR is refused and the balance is unchanged.

The rollback assertions are the point — they are what proves the transaction is really wrapping all three operations.

- [ ] **Step 3** Commit.

---

### Task 4: Sales module

Sales works the pre-application funnel, so it lists borrowers, not loans.

**Files:**
- Create: `apps/api/src/modules/sales/{service,controller,routes}.ts`
- Create: `packages/domain/src/lead/stage.ts` + test

**Interfaces:**
- `leadStage({ hasProfile, brePassed, hasLoan })` → `"SIGNED_UP" | "DETAILS_STARTED" | "NOT_ELIGIBLE" | "READY_TO_APPLY" | "APPLIED"`
- `GET /api/sales/leads` → `{ leads: LeadResponse[] }` (SALES, ADMIN)

The stage is a pure function in the domain, tested there. Borrowers who have applied stay on the list marked `APPLIED`, so Sales can see conversion rather than watching rows vanish.

- [ ] Steps: the pure function with tests, then the aggregation, controller, routes, verification that `SANCTION` gets 403 on this route, commit.

---

### Task 5: The queue shell

**Files:**
- Create: `apps/web/components/queue-shell.tsx`, `apps/web/components/data-table.tsx`
- Create: `apps/web/features/dashboard/ui/dashboard-nav.tsx`, `features/dashboard/public/index.ts`

**Interfaces:**
- `<QueueShell title subtitle count tiles rows columns expanded renderDetail>` — generic over the row type

What all four modules share is the shell: a header with a count, stat tiles, a responsive table that becomes cards below 640px, loading / empty / error states, and a row that expands in place to show detail plus that module's action panel. What they do not share is the action panel, which each module owns.

The nav shows only the modules the signed-in role may open — and that is cosmetic, because the API refuses the rest regardless.

- [ ] Steps: build the shell, the table with `tabular-nums` money columns, the expandable row, then commit.

---

### Task 6: The four module screens

**Files:**
- Create: `apps/web/features/dashboard/{sanction,disbursement,collection,sales}/` each with `public/` and `ui/`
- Create: `apps/web/app/dashboard/[module]/page.tsx` — one route shell resolving the module

Each screen: a server component loading its queue through `serverApi`, rendering `QueueShell` with its own columns and its own action panel.

- Sanction: approve, or reject with a required reason
- Disbursement: a single confirm action
- Collection: a payment form — UTR, amount, date — showing the outstanding balance and refusing an amount above it client-side for feedback, with the server as the authority
- Sales: read-only, with the funnel stage as a pill

- [ ] Steps per module, each verified in a browser before moving on. **Look at every screen, not just its endpoint** — plan 03 shipped a completely unstyled page that every curl check passed.

---

### Task 7: Gate and boundaries

- [ ] `pnpm lint && typecheck && test && boundaries && --filter @lms/web build`
- [ ] Confirm `api-modules-cannot-cross-import` still holds with seven modules
- [ ] Confirm `loan.status` is written in exactly one file:
  `grep -rn "status:" apps/api/src --include=*.ts | grep -v models | grep -v test` should show only the transition service

---

## Definition of done

- [ ] All gates pass
- [ ] A loan moves `APPLIED → SANCTIONED → DISBURSED → CLOSED` through the four screens
- [ ] Rejecting requires a reason, and that reason appears on the borrower's status page
- [ ] A second sanction of the same loan returns 409, not a silent double-write
- [ ] A payment equal to the outstanding balance closes the loan automatically
- [ ] An overpayment is refused **and leaves no payment row behind**
- [ ] A duplicate UTR is refused and the balance is unchanged
- [ ] Each executive gets 403 on every module that is not theirs; ADMIN gets all four
- [ ] Every screen has been opened in a browser and looked at

**Next:** `05-submission.md` — seeded demo data in every state, the README with the assignment's "think about" answers, a responsive pass, and the recording script.
