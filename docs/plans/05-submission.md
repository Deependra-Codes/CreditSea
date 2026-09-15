# Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a working system into a submission — a README that answers the questions the brief actually asked, a repo an evaluator can clone and run in five minutes, a layout that holds on a phone, and a recording that shows the whole loan lifecycle in under five minutes.

**Architecture:** No new features. This plan is documentation, hygiene, a responsive pass, and verification from a clean clone.

**Spec:** `docs/architecture.md`

**Preceded by:** plans 01–04

## What the brief is actually grading here

The assignment allocates only 5% to "README + repo hygiene", which undersells it: the README is also where the five *"Think about:"* prompts get answered, and those feed the 20% on code quality and the 15% on BRE and loan math. Those prompts are interview questions in disguise, and a repo that never answers them leaves marks on the table no matter how good the code is.

| Where it appears in the brief | What it wants |
|---|---|
| Step 2 | What is the correct PAN regex? |
| Step 2 | Should the BRE live on the client, the server, or both? Why? |
| Sanction | What status transitions happen here? |
| Disbursement | What should the next status be? |
| Collection | How do you track outstanding balance? What validations on payment amount? |
| RBAC | How are roles stored? How does middleware check them? What status for unauthorized? |

---

### Task 1: The README

**Files:**
- Create: `README.md`
- Verify: `.env.example`

**Sections, in this order** — an evaluator reads top-down and gives up quickly:

1. **What this is** — two sentences, then the stack.
2. **Run it in five minutes** — prerequisites, `corepack enable pnpm`, install, the two `.env` files, `pnpm seed`, `pnpm dev`. Exact commands, copy-pasteable.
3. **Login credentials** — the six roles in a table with the shared password, and a note that they are also one click away on the sign-in screen.
4. **What to look at first** — a short tour: apply as a borrower, watch the BRE fail and then pass, then move the loan through the four modules.
5. **The questions the brief asked** — each prompt answered directly, with the file that implements it.
6. **Architecture** — the monorepo shape, why `packages/domain` has zero dependencies, and the layer rules that are machine-enforced.
7. **Data model and API** — link to `docs/architecture.md` rather than repeating it, with the response envelope shown inline.
8. **Decisions and trade-offs** — the ones a reviewer would otherwise query: integer paise, cookie over localStorage, 200-not-422 on a BRE rejection, no shadcn, selective testing.
9. **Known limitations** — JWT role staleness, no refresh rotation, local disk uploads, no pagination. Listing them shows they were decisions.
10. **Testing** — what is covered and what is deliberately not, plus the commands.

- [ ] **Step 1** Write it, keeping every command exactly as it must be typed.
- [ ] **Step 2** Verify `.env.example` covers every variable `env.ts` requires and nothing more.
- [ ] **Step 3** Confirm no real credential appears anywhere in the tree or in git history.
- [ ] **Step 4** Commit.

---

### Task 2: Repo hygiene

**Files:**
- Create: `AGENTS.md`
- Verify: `.gitignore`, root `package.json` scripts

- [ ] **Step 1: AGENTS.md** — the engineering rules this repo actually follows, compressed to one page: business rules live in `packages/domain`; money is integer paise; `loan.status` is written in exactly one file; layer import directions; the file and function size limits; `utils/helpers/misc/temp` are banned folder names; and the escape hatch that a rule causing friction gets relaxed deliberately rather than worked around.

- [ ] **Step 2: Check the ignore list** covers `.env*` with `!.env.example`, `node_modules`, `.next`, `uploads`, `coverage`.

- [ ] **Step 3: Check the root scripts** read as a menu to someone who has never seen the repo: `dev`, `seed`, `test`, `lint`, `typecheck`, `boundaries`.

- [ ] **Step 4: Git identity.** Commits currently carry a work email. On a personal repo that neither links to the GitHub account nor belongs in a public tree. Set it per-repo before pushing:
  `git config user.email "<personal address>"`

- [ ] **Step 5** Commit.

---

### Task 3: Responsive pass

Every screen at 400px, with a real check rather than a glance: no horizontal body scroll, a 16px side gutter, and nothing clipped.

- [ ] **Step 1** Sign in and register — the brand panel must drop away, not squeeze.
- [ ] **Step 2** The wizard, all four steps — the aside stacks under the form; the sliders stay usable; the repayment bar keeps both labels.
- [ ] **Step 3** The status page — the lifecycle rail scrolls inside its own container, not the page.
- [ ] **Step 4** All four dashboard modules — secondary columns drop, the table scrolls in its own container, and the expanded detail and its action panel stay reachable.
- [ ] **Step 5** Fix what the pass finds, then commit.

---

### Task 4: The recording script

**Files:**
- Create: `docs/demo-script.md`

The brief asks for 3–5 minutes covering: borrower applies including a BRE pass **and** fail → executive approves → disburses → payment recorded → loan closes.

A script matters because the interesting failures — the BRE rejection, the duplicate UTR, the 403 — are easy to forget under a recording light, and they are exactly what the marks are for.

- [ ] **Step 1** Write it as timed beats with the exact values to type, including:
  - the BRE fail (DOB 2010-01-01, salary 9000, Unemployed — three rules go red at once)
  - correcting them and passing
  - a PNG renamed `.pdf` being refused, then a real PDF accepted
  - the quote at ₹50,000 / 30 days reading ₹493.15 interest
  - sanction approving, disbursement releasing
  - a partial payment, then the exact settlement that closes the loan
  - one 403: a disbursement executive opening the sanction module
- [ ] **Step 2** Note the reset command so the recording can be retaken: `pnpm seed`.
- [ ] **Step 3** Commit.

---

### Task 5: Verify from a clean clone

The only test that matters for "an evaluator can run this".

- [ ] **Step 1** Clone the repo into a temporary directory.
- [ ] **Step 2** Follow the README exactly, typing nothing that is not in it.
- [ ] **Step 3** Record every place the README was wrong or incomplete, and fix it.
- [ ] **Step 4** Run the full gate there: `pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries && pnpm --filter @lms/web build`.
- [ ] **Step 5** Commit the README fixes.

---

## Definition of done

- [ ] A fresh clone runs by following the README alone
- [ ] All six of the brief's questions are answered in the README, each pointing at the file that implements it
- [ ] The six role credentials are in the README and one click from the sign-in screen
- [ ] No real credential exists anywhere in the tree or in git history
- [ ] Every screen holds at 400px with no horizontal body scroll
- [ ] `docs/demo-script.md` covers the full lifecycle including the BRE fail and one 403
- [ ] The full gate passes from a clean clone
- [ ] Commits carry an identity that belongs on a personal repo

**After this:** rotate the Atlas password that was shared during development, push, and record.
