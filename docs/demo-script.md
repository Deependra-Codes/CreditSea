# Recording script

Target: 3–5 minutes covering borrower applies (BRE pass **and** fail) → sanction approves → disbursement releases → payment recorded → loan closes.

**Reset before each take:** `pnpm seed` — idempotent, and it clears `borrower@lms.test` so the wizard starts from nothing.

Have two browser profiles or one normal and one incognito window open, so you can hold a borrower session and an executive session at once without signing in and out on camera.

---

## 0:00 — Sign in (20s)

Open `http://localhost:3000`. The left panel shows the four stages a loan moves through; a token travels them on a loop.

Expand **Demo accounts**, click **Borrower**, sign in.

> "Six seeded accounts, one per role. The credentials are one click from the form so an evaluator never has to hunt for them."

## 0:20 — The eligibility check fails (50s)

Step 2. Enter:

| Field | Value |
|---|---|
| Full name | `Ananya Iyer` |
| PAN | `ABCPE1234F` |
| Date of birth | `01/01/2010` |
| Monthly salary | `9000` |
| Employment | `Unemployed` |

Click **Check eligibility**.

> "Three rules fail — age, salary, employment — and all three are shown at once. The engine returns every failure rather than the first, so the applicant does not discover them across three submissions."

Point out that the details are still saved:

> "A rejection is a 200, not a 422. The request was fine and the profile persisted — which is what lets them correct it here rather than starting over."

## 1:10 — Correcting it (30s)

Change date of birth to `01/01/1995`, salary to `64000`, employment to `Salaried`. Watch the rows resolve as you type.

> "The client runs the same rule module the server treats as authority. It is the same file — not a copy — so the two cannot drift."

Note the button as the last row turns green:

> "It stops saying *Check eligibility* once there is nothing left to check — the browser has already run the rules the server will. Now it just saves and moves on."

Click **Continue to salary slip**. The step advances.

## 1:40 — Upload, and a rejection (35s)

Rename any PNG to `slip.pdf` first. Upload it.

> "Refused. The declared type said PDF and the name said PDF; the server read the first bytes and they said PNG."

Upload a real PDF. The step advances.

## 2:15 — The quote (35s)

Step 4. Leave the sliders at **₹50,000** and **30 days**.

> "₹493.15 interest, ₹50,493.15 total."

Drag tenure to 365 days and back.

> "The bar is the split at true proportion — at thirty days the interest is a sliver, at a year it is a block. It is computed by the same function the API stores with, in integer paise, so the figure on screen is the figure in the ledger."

Click **Apply for this loan**. The status page shows the lifecycle rail at Applied.

## 2:50 — Role-based access (25s)

In the second window, sign in as `disbursement@lms.test`.

> "The nav offers only Disbursement."

Navigate to `/dashboard/sanction` manually.

> "Refused. Hiding the menu item is not the control — the API returns 403 whether or not the UI offered it."

## 3:15 — Sanction and disbursement (40s)

Sign in as `sanction@lms.test`. The new application is in the queue. Open the row, then **Approve loan**.

> "Every status change goes through one service, and it writes conditional on the status it observed — so two executives clicking at once cannot both succeed."

Sign in as `disbursement@lms.test`. Open the row, **Mark as disbursed**.

## 3:55 — Payment and auto-close (50s)

Sign in as `collection@lms.test`. Open the row. The outstanding balance is pre-filled.

First a partial payment: UTR `UTR1001`, amount `10000`.

> "Balance drops, the loan stays open, and the form comes back empty against the new balance — the spent UTR is not left sitting in the box."

Now try the same UTR again.

> "Refused by name — the UTR is unique in the database, not just checked in code."

Now pay more than the balance.

> "Refused, and no payment row is left behind: the insert, the decrement and the close run in one transaction."

Finally, pay the exact outstanding balance.

> "Zero outstanding, and the loan closed itself. That equality only holds because money is stored as integer paise — in floating-point rupees this balance is 40,493.1506… and would never land on zero."

## 4:45 — Close (15s)

Switch to the borrower window and refresh the status page.

> "The borrower sees the same lifecycle rail the executives see, now at Closed, with the full history of who moved it and when."

---

## Things worth mentioning if time allows

- Sales shows the pre-application funnel, and keeps converted leads on the list rather than dropping them
- `pnpm boundaries` fails the build if a business rule is written outside `packages/domain`
- 82 tests, weighted at the BRE boundaries and the loan math anchors
- The theme switch is in every shell, and the new theme is wiped in as a circle from the control itself

## Before recording

```bash
pnpm seed
pnpm dev
```

Check the API is on `:4000` and the web on `:3000`, and that your Atlas IP allowlist still includes your current address.

`pnpm seed` resets the demo cohort but deliberately leaves real signups alone — so any account created while testing still shows in **Sales**. Drop those from the `users` collection first if you plan to show that screen.
