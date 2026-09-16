# Narration

Read aloud, line by line. `demo-script.md` is the plan; this is the words.

Sentences are short on purpose — long ones are hard to read while clicking. Pause
between lines. Nobody minds a pause; everybody notices a stumble.

**If you would rather not speak, don't.** The brief asks for a screen recording,
not a voice-over. Silent is fine. Speaking only helps because the marks for the
brief's *"Think about"* questions are easiest to show out loud.

**Before you start:** drop the display to a smaller scaled resolution, size the
browser to about 1280 wide, and record only that window with ⇧⌘5 → Record
Selected Portion. Run `pnpm seed`, then `pnpm dev`.

---

| Do | Say |
|---|---|
| Open `localhost:3000` | "This is a loan management system. Borrowers apply. Four internal teams move the loan through its life." |
| Point at the card on the left | "That card is one loan going through all four stages, on a loop." |
| Expand **Demo accounts** | "Six seeded accounts, one per role. One click fills the form, so nobody has to hunt for credentials." |
| Click **Borrower**, sign in | |

## Step 2 — the rule engine

| Do | Say |
|---|---|
| Type name `Ananya Iyer`, PAN `ABCPE1234F` | "Now the eligibility check. Four rules." |
| Date of birth `01/01/2010` | "Under age." |
| Salary `9000` | "Under the salary floor." |
| Employment → `Unemployed` | "And unemployed." |
| Point at the three red rows | "Three rules fail, and all three show at once. The engine returns every failure, not the first one. So you fix everything in one go." |
| Point at the button, which is off | "There is no check button to press. The browser runs the same rule file the server uses. The rows are already the answer." |

## Step 2 — fixing it

| Do | Say |
|---|---|
| Date of birth → `01/01/1995` | "Age passes." |
| Salary → `64000` | "Salary passes." |
| Employment → `Salaried` | "And employment." |
| Point at the button turning on | "Same file on both sides, not a copy. So the browser and the server can never disagree." |
| Click **Continue to salary slip** | "The server still runs all four again on the write. The browser check is only a convenience." |

## Step 3 — the upload

| Do | Say |
|---|---|
| Upload a PNG you renamed to `.pdf` | "This file is named dot pdf. It is really a PNG." |
| Point at the rejection | "Refused. The server read the first bytes of the file, not its name." |
| Choose a real PDF | "A real one is accepted." |
| Point at the preview | "You can see what you picked before you send it." |
| Click **Upload and continue** | |

## Step 4 — the money

| Do | Say |
|---|---|
| Leave sliders at ₹50,000 and 30 days | "Fifty thousand rupees, thirty days, twelve percent." |
| Point at the total | "Interest is four hundred ninety three rupees fifteen paise. That is the simple interest formula from the brief." |
| Drag tenure to 365 and back | "The bar is the real split. At thirty days the interest is a sliver. At a year it is a block." |
| | "This is the same function the API stores with. So the number on screen is the number in the database." |
| Click **Apply for this loan** | "Applied. Now it goes to the teams." |

## Access control

| Do | Say |
|---|---|
| Second window: sign in as `disbursement@lms.test` | "This is the disbursement executive." |
| Point at the nav | "The menu only offers their own module." |
| Type `/dashboard/sanction` in the address bar | "But hiding a menu item is not security. Let me open the sanction module directly." |
| Point at the refusal | "Refused. The API returns 403 whether or not the interface offered it." |

## Sanction and disbursement

| Do | Say |
|---|---|
| Sign in as `sanction@lms.test`, open the row | "The new application is here." |
| Click **Approve loan** | "Approved." |
| | "Every status change goes through one service. It writes conditional on the status it just read. So two executives clicking at the same moment cannot both succeed." |
| Sign in as `disbursement@lms.test`, open the row | |
| Click **Mark as disbursed** | "Funds released. Now it is collectible." |

## Collection — the part worth watching

| Do | Say |
|---|---|
| Sign in as `collection@lms.test`, open the row | "The outstanding balance is pre-filled." |
| UTR `UTR1001`, amount `10000`, record | "A part payment. Balance drops. The loan stays open." |
| | "And the form comes back empty, against the new balance." |
| Enter UTR `UTR1001` again, record | "Now the same UTR twice." |
| Point at the refusal | "Refused by name. The UTR is unique in the database, not just checked in code." |
| Enter an amount larger than the balance | "Now more than what is owed." |
| Point at the refusal | "Refused. And no payment row is left behind. The insert, the balance and the close all run in one transaction." |
| Enter the exact outstanding, record | "Now the exact amount." |
| Point at the status | "Zero outstanding, and the loan closed itself." |
| | "That only works because money is stored as whole paise. In floating point rupees this balance never lands on zero, and the loan would stay open for ever." |

## Close

| Do | Say |
|---|---|
| Borrower window, refresh the status page | "The borrower sees the same rail the executives see. Now closed, with who moved it and when." |
| | "That is the whole lifecycle. Thanks for watching." |

---

## If you have time left

| Say |
|---|
| "The business rules live in one package with zero dependencies. The browser and the server both import it, so they cannot drift." |
| "The architecture rules are machine-enforced. `pnpm boundaries` fails the build if a business rule is written in the wrong place." |
| "Ninety-six tests, weighted at the rule boundaries, the loan math, and the two services that move money." |

## If something goes wrong mid-take

Stop, run `pnpm seed`, and start the beat again. The seed is idempotent and it
clears `borrower@lms.test` so the wizard starts from nothing.
