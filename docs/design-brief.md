# Design brief

Paste the relevant section into a design tool. Each is self-contained — a tool receiving it has none of this repo's context.

---

## The product, in one paste

> **Lending Portal** — a loan management system for a small Indian lender.
>
> **Two audiences, one system.**
>
> *Borrowers* apply for a personal loan through a four-step flow: create an account, enter their personal details and pass an eligibility check, upload a salary slip, then choose an amount and tenure and apply. After applying they track the loan to closure.
>
> *Internal executives* work an operations dashboard. Four teams, each owning exactly one stage of the loan's life: **Sales** tracks registered borrowers who have not applied yet, **Sanction** approves or rejects applications, **Disbursement** releases funds, **Collection** records repayments until the loan settles. An **Admin** sees all four plus an overview of the whole book.
>
> **The loan's life is a straight line:** Applied → Sanctioned → Disbursed → Closed, with Rejected as a dead end from Applied. Every screen in the product refers back to this line, so it is the single strongest visual idea available.
>
> **Loan terms:** ₹50,000 to ₹5,00,000, over 30 to 365 days, at a fixed 12% per annum simple interest.
>
> **The feel:** modern Indian fintech — Razorpay, Stripe, Zerodha. Confident and calm, not playful. This is someone's debt, so it must read trustworthy first and clever second. Dense where an executive works all day; generous where a borrower makes one decision.

---

## Design system already in place

Match these rather than inventing new ones — the built product uses them.

**Colour**

| Role | Light | Dark |
|---|---|---|
| Primary / brand | `#0F766E` teal | `#2BA89E` |
| Ink (headings) | `#111827` | `#F0F4F8` |
| Body text | `#4B5563` | `#9AA7B8` |
| Muted text | `#697386` | `#6F7D91` |
| Page ground | `#F6F7F9` | `#0B0F1A` |
| Card | `#FFFFFF` | `#131720` |
| Hairline | `rgb(17 24 39 / 0.10)` | `rgb(240 244 248 / 0.12)` |
| Good | `#15803D` | `#22A35A` |
| Critical | `#B91C1C` | `#E05252` |

The four lifecycle stages use **one hue whose lightness carries the order**, because the stages are a sequence — not four unrelated colours:

`Applied #14B8A6` → `Sanctioned #0D9488` → `Disbursed #0F766E` → `Closed #134E4A`

Rejected sits outside that ramp at `#B91C1C`, because it is a dead end rather than a further stage.

**Type** — Manrope throughout, 400 to 800. Headings at weight 800 with `-0.018em` tracking and `1.15` line height. Tabular figures everywhere (`font-feature-settings: "tnum"`), so columns of money never shift. JetBrains Mono for PANs, UTRs and identifiers only.

**Surfaces** — a 1px ring rather than a border; 8px radius on cards, 6px on controls. Motion uses one easing curve, `cubic-bezier(0.2, 0.8, 0.2, 1)`, and one primitive: content arrives with a 10px fade-up over ~320ms.

---

## Screen 1 — Sign in

**Job:** get six kinds of user into the right place, and tell a first-time visitor what this is.

**Layout:** a two-column split on desktop, form only below ~1024px.

**Left — the product.** This half exists because a lone centred form on a wide screen says nothing. It carries:

- A short eyebrow: *Lending Portal*
- A headline naming the idea: *"Four steps to a loan, and four hands that move it."*
- One supporting line: borrowers apply in one sitting; sanction, disbursement and collection each work the stage that is theirs
- **A looping animation of the loan's own lifecycle** — a token travelling a four-stop pipeline, each stop lighting as it arrives, the track filling behind it. This is the one thing on the page that moves, and it is the product's actual shape rather than decoration
- Three small tiles carrying the terms: ₹50K–₹5L · 30–365 days · 12% p.a.
- **Behind all of it: a CSS mesh gradient in the brand hue, with film grain.** Four bleeding radial pools, heavily blurred, drifting on a ~26s cycle, over a hairline dot grid, finished with a noise overlay at ~16% on overlay blend and a vignette so the panel edge does not cut a pool in half.

  Not a photograph: in a lending back-office any stock image reads as filler within a second. Research on 2025–26 SaaS login pages is blunt about this — mesh gradients are "the single highest-leverage visual signal for premium fintech", and the CSS version is indistinguishable from a designed asset while shipping no asset at all. **The grain is the part that matters**: a clean gradient reads flat and digital, a faintly grained one reads printed, and that is what makes the technique look expensive rather than default.

**Right — the form.**

- Heading *Sign in*, one line of subtitle
- Email and password, both on a card
- A full-width primary button
- Below it, a collapsed **Demo accounts** panel listing six roles — borrower, sales, sanction, disbursement, collection, admin — each clickable to fill the form. This exists because an evaluator should never hunt for credentials
- A footer link to *Create a borrower account*

**The signature interaction — the two halves swap sides.** Choosing *Create a borrower account* does not navigate. The product half slides right, the form half slides left, they pass each other over ~700ms on the standard easing, and the form's contents cross-fade from sign-in to register. Going back reverses it.

This is worth the effort because a page load between sign-in and register throws away whatever the visitor was reading on the left, and because the swap makes the two modes feel like one place rather than two pages. Both URLs still render on the server so a direct load or bookmark works; the address is corrected in place when the mode changes.

Below 1024px there is no swap — the product half is not rendered, and the form is simply the page.

**States to design:** resting, focused field, a form-level error (wrong credentials), the button's pending state, and the mid-swap frame.

**Do not:** centre a lone card on an empty page; use a stock illustration of people shaking hands; add a marketing hero. The left half earns its space by explaining the product, not by filling it.

---

## Screen 2 — Eligibility step (the most distinctive screen)

Step 2 of the borrower flow, and the screen worth designing carefully because nothing else in the product looks like it.

**The idea:** the rule engine returns **every** failure at once, not the first. So the four rules stand open on screen as a live checklist and settle as the applicant types — like a password-strength meter, but for loan eligibility.

**The four rules:**
1. Age must be between 23 and 50 years
2. Monthly salary must be at least ₹25,000
3. PAN must be five letters, four digits, then one letter
4. Unemployed applicants are not eligible

**Each row has three states:** not yet checked (hollow ring, muted text), met (filled green circle with a tick), not met (filled red circle with a cross, the row tinted, and the offending value shown on the right — *"you are 19"*, *"₹18,000"*).

**Above it:** five fields — full name, PAN, date of birth, monthly salary, employment (a select). Two columns on desktop.

**Beside it:** a context column showing where the applicant is in the four steps, what each remaining step will ask for, and a short note on who can see their PAN and payslip.

**The important nuance:** a rejection is **not an error state**. The details are saved and this is the same screen where they get corrected — so the design should read as *"not yet"*, never as *"something went wrong"*.

---

## Screen 3 — An operations queue

Sanction, Disbursement and Collection share one shape; Sales is the same shape over people rather than loans.

- Title, a count badge, one line of subtitle
- A row of stat tiles: in queue, oldest wait, value queued
- A search field filtering by name or PAN
- A dense table: applicant, PAN (mono), principal, tenure, repayable — money right-aligned and tabular. Secondary columns drop below 640px; the table scrolls in its own container, never the page
- **Rows expand in place** rather than opening a modal — a queue is worked one row at a time, so the list stays visible. The expanded area shows the lifecycle rail for that loan, its figures, a link to the salary slip, and that module's single action: approve or reject with a reason, release funds, or record a payment
- An empty queue is a normal state, not a failure: an icon, a title, and one line saying what fills it

---

## What to avoid across all screens

- Status communicated by colour alone — every pill carries its name
- A pie chart for loan statuses; they are a sequence, so bars ordered by stage
- Generic dashboard clip-art, gradient hero banners, or centred everything
- Numbers that jump — money eases between values and uses tabular figures
