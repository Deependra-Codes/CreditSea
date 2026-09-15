# Borrower Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js app and the four-step borrower journey, so the system becomes demonstrable end to end in a browser: register, be told exactly why you are ineligible, fix it, upload a slip, and apply.

**Architecture:** Next.js App Router with server components fetching initial state (forwarding the auth cookie) and client islands owning interaction. `middleware.ts` reads the cookie and guards routes by role before a protected page renders. `@lms/domain` is imported directly by the browser for instant BRE feedback and the live quote — the same module the API treats as authority.

**Tech Stack:** Next.js (App Router) · React 19 · Tailwind CSS v4 (CSS-first `@theme`) · TypeScript · `@lms/domain` · `@lms/contracts`

**Spec:** `docs/architecture.md`

**Preceded by:** `docs/plans/01-foundation.md`, `docs/plans/02-borrower-api.md`

## Global Constraints

Plans 01 and 02 still apply. In addition:

- Layer order `app → features → entities → components / lib`; imports go downward only, and slices on the same layer never import each other.
- `app/` holds route shells. A page file wires a layout and renders a feature's public entry — no business logic, no fetch calls beyond the initial server load.
- Business rules are imported from `@lms/domain`, never restated. A PAN regex or an interest formula written inside `apps/web` is a bug.
- Money crosses the wire in rupees; `Paise` never appears in a payload.
- Every interactive control has a stable `id`, a visible focus state, and respects `prefers-reduced-motion`.
- The page must hold at 400px wide with a 16px side gutter, and no horizontal body scroll.

## Design tokens

Validated with the dataviz palette validator; do not substitute values by eye.

| Role | Light | Dark | Notes |
|---|---|---|---|
| ink | `#0a2540` | `#eef2f8` | headings, primary text |
| ink-2 | `#425466` | `#a3b0c2` | body |
| ink-3 | `#697386` | `#6f7d91` | captions, axis text |
| canvas | `#ffffff` | `#0a0e1a` | cards, inputs |
| surface | `#f6f9fc` | `#111726` | page ground |
| line | `#e3e8ee` | `#1e2738` | hairlines |
| accent | `#635bff` | `#8078ff` | CTA, focus ring, active |
| stage 1–4 | `#a79fff` `#8078ff` `#635bff` `#3f37c9` | reversed | **ordinal ramp** |
| interest | `#eb6834` | `#d95926` | the cost segment |
| critical | `#e34948` | `#e66767` | rejected |
| good | `#1baf7a` | `#199e70` | rule passed |

**The four lifecycle stages are one hue, not four colours.** `APPLIED → SANCTIONED → DISBURSED → CLOSED` is a sequence — reordering it changes the meaning — so it is an *ordinal* ramp where lightness carries the order, not a categorical palette. `REJECTED` sits outside the ramp because it is a terminal failure, not a further stage. Validation on white: monotone lightness, every adjacent ΔL ≥ 0.06, light end 2.32:1. Repayment pair (accent ↔ interest): CVD ΔE 31.4 light, 30.4 dark, against a target of 8.

Neutrals lean blue rather than sitting neutral grey, so the ground belongs to the accent.

---

## A change from the earlier decision: no shadcn/ui in this plan

Earlier we chose shadcn/ui. Working through what this plan actually needs changed that, and the reasoning should be visible rather than silently reversed.

shadcn earns its place where behaviour is genuinely hard — focus traps, dismissal, roving tabindex. The borrower portal needs none of it: text inputs, a date input, a select, a file input, two range sliders, and a stepper. Native `<input type="range">` with `accent-color` is keyboard-accessible and screen-reader-labelled for free; a Radix slider would add a dependency to re-solve that.

So this plan hand-rolls its controls against the tokens above, and the decision is revisited in plan 04, where the dashboard's detail drawer wants a real focus trap. That is the point to add the dependency — when something needs it.

---

### Task 1: Next.js app with the token system

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.env.local.example`
- Create: `apps/web/app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Modify: root `.gitignore` (already covers `.next/`)

**Interfaces:**
- Produces: `pnpm --filter @lms/web dev` serves on :3000; every token above available as a Tailwind utility and a CSS variable.

- [ ] **Step 1: Create the manifest**

```json
{
  "name": "@lms/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "echo \"no web tests — the demo video is the E2E proof\" && exit 0"
  },
  "dependencies": {
    "@lms/contracts": "workspace:*",
    "@lms/domain": "workspace:*",
    "next": "^15.5.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^24.10.1",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.9.3"
  }
}
```

Next transpiles workspace packages under the App Router automatically, so `@lms/domain` needs no `transpilePackages` entry. Confirm in Step 5 before relying on it.

- [ ] **Step 2: Config files**

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es2022"],
    "jsx": "preserve",
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  typedRoutes: true,
};

export default config;
```

`apps/web/postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

- [ ] **Step 3: Tokens as the single source**

`apps/web/app/globals.css` — Tailwind v4 is CSS-first, so the palette lives here and generates utilities:

```css
@import "tailwindcss";

@theme {
  --color-ink: #0a2540;
  --color-ink-2: #425466;
  --color-ink-3: #697386;
  --color-canvas: #ffffff;
  --color-surface: #f6f9fc;
  --color-line: #e3e8ee;
  --color-line-2: #cfd7df;

  --color-accent: #635bff;
  --color-accent-dim: #8078ff;

  --color-stage-1: #a79fff;
  --color-stage-2: #8078ff;
  --color-stage-3: #635bff;
  --color-stage-4: #3f37c9;

  --color-interest: #eb6834;
  --color-critical: #e34948;
  --color-good: #1baf7a;

  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;

  --radius-card: 8px;
  --radius-ctrl: 6px;

  --shadow-lift-1: 0 1px 1px rgb(10 37 64 / 0.04), 0 3px 6px rgb(10 37 64 / 0.05);
  --shadow-lift-2: 0 2px 4px rgb(10 37 64 / 0.05), 0 8px 16px rgb(10 37 64 / 0.08);
}

/* Dark is selected against its own ground, not an inversion of light. */
@media (prefers-color-scheme: dark) {
  :root {
    --color-ink: #eef2f8;
    --color-ink-2: #a3b0c2;
    --color-ink-3: #6f7d91;
    --color-canvas: #0a0e1a;
    --color-surface: #111726;
    --color-line: #1e2738;
    --color-line-2: #2c3548;
    --color-accent: #8078ff;
    --color-accent-dim: #635bff;
    --color-stage-1: #3f37c9;
    --color-stage-2: #635bff;
    --color-stage-3: #8078ff;
    --color-stage-4: #a79fff;
    --color-interest: #d95926;
    --color-critical: #e66767;
    --color-good: #199e70;
  }
}

body {
  background: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: Root layout**

`apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lending Portal",
  description: "Apply for a loan and track it through to closure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx` — a placeholder replaced in Task 3:

```tsx
export default function Home() {
  return <main className="p-8 text-ink">Lending Portal</main>;
}
```

- [ ] **Step 5: Verify the app boots and the workspace package resolves**

Add a temporary line to `app/page.tsx`:

```tsx
import { quoteLoan, rupeesToPaise } from "@lms/domain";
// inside the component:
// <p>{quoteLoan(rupeesToPaise(50_000), 30).interestPaise}</p>
```

```bash
pnpm install
pnpm --filter @lms/web dev
curl -s http://localhost:3000 | grep -o "49315"
```

Expected: `49315` — the domain package is resolving and running in the Next build without `transpilePackages`. **Remove the temporary import** afterwards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): scaffold Next.js app with the validated token system"
```

---

### Task 2: API client and session

**Files:**
- Create: `apps/web/lib/api.ts`, `apps/web/lib/server-api.ts`, `apps/web/lib/env.ts`

**Interfaces:**
- Produces:
  - `api<T>(path, init?): Promise<T>` — browser client; throws `ApiClientError` carrying `status`, `code`, `details`
  - `serverApi<T>(path): Promise<T | null>` — server components; forwards the incoming cookie
  - `class ApiClientError extends Error { status, code, details }`

- [ ] **Step 1: Environment**

`apps/web/lib/env.ts`:

```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
```

`apps/web/.env.local.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 2: The browser client**

`apps/web/lib/api.ts`:

```ts
import type { ApiResult } from "@lms/contracts";
import { API_URL } from "./env";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Every response is unwrapped here, so no call site inspects `ok` or reads a
 * status code. credentials: "include" is what carries the auth cookie
 * cross-origin in development.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "content-type": "application/json", ...init?.headers },
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as ApiResult<T>;
  if (!payload.ok) {
    throw new ApiClientError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
    );
  }
  return payload.data;
}
```

- [ ] **Step 3: The server-component client**

`apps/web/lib/server-api.ts`:

```ts
import type { ApiResult } from "@lms/contracts";
import { cookies } from "next/headers";
import { API_URL } from "./env";

/**
 * Server components have no automatic cookie jar, so the incoming request's
 * cookies are forwarded explicitly. Returns null rather than throwing: a page
 * that cannot load its data should render its empty state, not a 500.
 */
export async function serverApi<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok && response.status !== 200) return null;

  const payload = (await response.json()) as ApiResult<T>;
  return payload.ok ? payload.data : null;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add typed API clients that unwrap the shared envelope once"
```

---

### Task 3: Route guarding in middleware

This is the frontend half of the RBAC requirement, and the reason the token lives in a cookie rather than `localStorage` — middleware can read cookies and cannot read `localStorage`.

**Files:**
- Create: `apps/web/middleware.ts`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: `MODULE_ROLES`, `Role` from `@lms/domain`
- Produces: unauthenticated visitors to a protected path land on `/login`; a borrower reaching `/dashboard/*` is redirected to `/apply`; an executive reaching `/apply` is redirected to their module.

- [ ] **Step 1: Write the middleware**

`apps/web/middleware.ts`:

```ts
import { MODULE_ROLES, type ModuleName, type Role } from "@lms/domain";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "lms_token";

/**
 * Reads the role from the JWT payload without verifying it. That is deliberate:
 * this is a redirect, not a permission. The API verifies every request, so a
 * forged cookie buys a rendered shell whose data calls all return 401/403.
 */
function roleFromToken(token: string | undefined): Role | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.role === "string" ? (json.role as Role) : null;
  } catch {
    return null;
  }
}

const homeFor = (role: Role): string => {
  if (role === "BORROWER") return "/apply";
  const owned = (Object.keys(MODULE_ROLES) as ModuleName[]).find((module) =>
    (MODULE_ROLES[module] as readonly Role[]).includes(role),
  );
  return owned ? `/dashboard/${owned}` : "/dashboard/sanction";
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = roleFromToken(req.cookies.get(AUTH_COOKIE)?.value);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!role) {
    if (isAuthPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage || pathname === "/") {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  if (pathname.startsWith("/apply") && role !== "BORROWER") {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  if (pathname.startsWith("/dashboard") && role === "BORROWER") {
    return NextResponse.redirect(new URL("/apply", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The comment on `roleFromToken` matters: decoding without verifying looks wrong at a glance, and a reviewer should find the reasoning next to the code rather than having to reconstruct it. The middleware chooses a destination; the API decides access.

- [ ] **Step 2: Verify the redirects**

With both servers running:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/apply
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/dashboard/sanction
```

Expected: both `307` to `/login`. After logging in through the browser as `borrower@lms.test`, `/dashboard/sanction` must redirect to `/apply`; as `sanction@lms.test`, `/apply` must redirect to `/dashboard/sanction`.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(web): guard routes by role in middleware"
```

---

### Task 4: Shared UI primitives

Built once here and used by every later screen, including the dashboard in plan 04.

**Files:**
- Create: `apps/web/components/button.tsx`, `field.tsx`, `pill.tsx`, `lifecycle-rail.tsx`, `money.tsx`

**Interfaces:**
- Produces:
  - `<Button variant="primary" | "ghost">`
  - `<Field label htmlFor error>` — wraps an input with its label and error text
  - `<StatusPill status={LoanStatus}>` — dot plus name; never colour alone
  - `<LifecycleRail status={LoanStatus}>` — the four stages, current one ringed
  - `<Money paise={number}>` — formats via `formatPaise`, renders `tabular-nums`

- [ ] **Step 1: Money and status, driven by the domain**

`apps/web/components/money.tsx`:

```tsx
import { type Paise, formatPaise } from "@lms/domain";

export function Money({ paise, className = "" }: { paise: number; className?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {formatPaise(paise as Paise)}
    </span>
  );
}
```

`apps/web/components/pill.tsx`:

```tsx
import type { LoanStatus } from "@lms/domain";

const DOT: Record<LoanStatus, string> = {
  APPLIED: "bg-stage-1",
  SANCTIONED: "bg-stage-2",
  DISBURSED: "bg-stage-3",
  CLOSED: "bg-stage-4",
  REJECTED: "bg-critical",
};

const LABEL: Record<LoanStatus, string> = {
  APPLIED: "Applied",
  SANCTIONED: "Sanctioned",
  DISBURSED: "Disbursed",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

/** The name is always present — status never rests on colour alone. */
export function StatusPill({ status }: { status: LoanStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2 py-0.5 text-[11px] font-semibold ${
        status === "REJECTED" ? "text-critical" : "text-ink-2"
      }`}
    >
      <span className={`size-[7px] shrink-0 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </span>
  );
}
```

Both `Record<LoanStatus, …>` maps are exhaustive: adding a status to the domain fails the build here until this file handles it.

- [ ] **Step 2: The lifecycle rail**

`apps/web/components/lifecycle-rail.tsx`:

```tsx
import type { LoanStatus } from "@lms/domain";

const STAGES = [
  { status: "APPLIED", label: "Applied", dot: "bg-stage-1" },
  { status: "SANCTIONED", label: "Sanctioned", dot: "bg-stage-2" },
  { status: "DISBURSED", label: "Disbursed", dot: "bg-stage-3" },
  { status: "CLOSED", label: "Closed", dot: "bg-stage-4" },
] as const;

export function LifecycleRail({ status }: { status: LoanStatus }) {
  if (status === "REJECTED") {
    return (
      <p className="text-sm text-critical">
        This application was rejected and did not enter the lifecycle.
      </p>
    );
  }

  const reached = STAGES.findIndex((stage) => stage.status === status);

  return (
    <ol className="flex items-center overflow-x-auto pb-1" aria-label="Loan lifecycle">
      {STAGES.map((stage, index) => (
        <li key={stage.status} className="contents">
          {index > 0 && (
            <span
              className={`h-0.5 min-w-3 flex-auto ${index <= reached ? "bg-stage-2" : "bg-line-2"}`}
            />
          )}
          <div className="flex w-24 shrink-0 flex-col items-center gap-1.5">
            <span
              className={`size-3 rounded-full ${index <= reached ? stage.dot : "bg-canvas border-2 border-line-2"} ${
                index === reached ? "ring-4 ring-accent/20" : ""
              }`}
            />
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                index <= reached ? "text-ink" : "text-ink-3"
              }`}
            >
              {stage.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

`REJECTED` is handled first because it is not a stage on this rail — rendering it as "stuck at Applied" would misdescribe what happened.

- [ ] **Step 3: Button and Field**

`apps/web/components/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

const STYLES = {
  primary:
    "bg-accent text-white shadow-[0_1px_1px_rgb(10_37_64/0.08),0_2px_5px_rgb(99_91_255/0.28)] hover:-translate-y-px",
  ghost: "bg-canvas text-ink-2 border border-line-2 hover:shadow-lift-1",
} as const;

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-ctrl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[variant]} ${className}`}
    />
  );
}
```

`apps/web/components/field.tsx`:

```tsx
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "rounded-ctrl border border-line-2 bg-canvas px-3 py-2 text-sm text-ink " +
  "shadow-[0_1px_1px_rgb(10_37_64/0.04)] focus:border-accent focus:outline-none " +
  "focus:ring-[3px] focus:ring-accent/20";
```

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add shared primitives driven by domain types"
```

---

### Task 5: Authentication screens

**Files:**
- Create: `apps/web/features/auth/public/login-page.tsx`, `register-page.tsx`, `public/index.ts`
- Create: `apps/web/features/auth/ui/auth-form.tsx`
- Create: `apps/web/app/login/page.tsx`, `app/register/page.tsx`

**Interfaces:**
- Consumes: `api`, `loginSchema`, `registerSchema`, `Button`, `Field`, `inputClass`
- Produces: `LoginPage`, `RegisterPage` exported from `features/auth/public`

- [ ] **Step 1: The shared form**

`apps/web/features/auth/ui/auth-form.tsx` is a client component holding email, password and (on register) full name. On submit it calls `api("/api/auth/login", { method: "POST", body: JSON.stringify(values) })`, then `router.replace("/")` and lets middleware route by role.

Error handling reads the thrown `ApiClientError`:

```tsx
catch (err) {
  if (err instanceof ApiClientError) {
    setFormError(err.message);
    if (err.code === "VALIDATION_FAILED") setFieldErrors(toFieldErrors(err.details));
  } else {
    setFormError("Could not reach the server. Check that the API is running.");
  }
}
```

`toFieldErrors` turns the API's `[{ path, message }]` array into a record keyed by field — written once in `lib/api.ts` because every form in plans 03 and 04 needs it.

- [ ] **Step 2: Seeded credentials on the login screen**

Below the form, render the six seeded accounts as one-click fills:

```tsx
<details className="mt-6 text-xs text-ink-3">
  <summary className="cursor-pointer">Demo accounts</summary>
  {/* admin@lms.test · sales@lms.test · sanction@lms.test ·
      disbursement@lms.test · collection@lms.test · borrower@lms.test
      all with Password@123 */}
</details>
```

The assignment requires handing the evaluator working credentials. Putting them one click from the login form is faster than a README lookup and makes the demo video smoother. This is safe only because these are seeded demo accounts — note that in the README.

- [ ] **Step 3: Route shells**

`apps/web/app/login/page.tsx` is three lines: import `LoginPage` from `features/auth/public` and render it. No logic in the route shell.

- [ ] **Step 4: Verify**

In a browser: register a new borrower, land on `/apply`. Log out, log in as `sanction@lms.test`, land on `/dashboard/sanction` (a 404 until plan 04 — the redirect is what matters here).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add login and registration with one-click demo accounts"
```

---

### Task 6: The wizard shell and eligibility step

**Files:**
- Create: `apps/web/features/application/public/apply-page.tsx`, `public/index.ts`
- Create: `apps/web/features/application/ui/wizard-steps.tsx`, `eligibility-form.tsx`, `eligibility-checklist.tsx`
- Create: `apps/web/app/apply/page.tsx`

**Interfaces:**
- Consumes: `serverApi` for the initial `/api/application/me`, `evaluateBre`, `BRE_RULES` from `@lms/domain`
- Produces: `ApplyPage` — a server component that loads current state and renders the client wizard

- [ ] **Step 1: The checklist component**

`eligibility-checklist.tsx` renders one row per rule with three states — `pending`, `pass`, `fail` — driven by `BRE_RULES` so the list cannot drift from the engine:

```tsx
import { BRE_RULES, type BreFailure } from "@lms/domain";

export function EligibilityChecklist({
  failures,
  evaluated,
}: {
  failures: BreFailure[];
  evaluated: boolean;
}) {
  const failed = new Map(failures.map((failure) => [failure.code, failure.message]));
  return (
    <ul className="flex flex-col gap-1.5">
      {BRE_RULES.map((rule) => {
        const state = !evaluated ? "pending" : failed.has(rule.code) ? "fail" : "pass";
        // ...row with ✓ / ✕ / ○ glyph, rule.message, and the failure detail
      })}
    </ul>
  );
}
```

Iterating `BRE_RULES` rather than hardcoding four rows is the point: a fifth rule added in the domain appears here with no edit.

- [ ] **Step 2: Live client-side evaluation**

The form calls `evaluateBre` on every change for instant feedback. On submit, `PUT /api/application/profile` returns the authoritative `bre`, which replaces the local result.

```tsx
// Same module the API treats as authority — a client check is a convenience,
// never a control, and the server re-evaluates on every write.
const local = evaluateBre({ pan, dateOfBirth, monthlySalaryPaise, employmentMode });
```

- [ ] **Step 3: Handle the 200-with-failures response**

A BRE rejection is a `200`, so it is read from the response body, not from a catch block:

```tsx
const { profile, bre } = await api<{ profile: Profile; bre: BreResult }>(
  "/api/application/profile",
  { method: "PUT", body: JSON.stringify(values) },
);
setBre(bre);
if (bre.passed) goToStep(3);
```

- [ ] **Step 4: The step indicator**

`wizard-steps.tsx` renders four numbered steps with the current one marked, and steps the user has completed shown as done. Numbering is legitimate here — this *is* a sequence, and the user needs to know how many remain.

- [ ] **Step 5: Verify both paths in the browser**

As `borrower@lms.test`: enter DOB `2010-01-01`, salary `9000`, employment `UNEMPLOYED` — three rows turn red at once and the step does not advance. Correct all three and the step advances.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the eligibility step with a live rule checklist"
```

---

### Task 7: Salary slip upload

**Files:**
- Create: `apps/web/features/application/ui/slip-upload.tsx`

**Interfaces:**
- Consumes: `api` with a `FormData` body, `ALLOWED_UPLOADS` bounds via a plain accept string
- Produces: step 3 of the wizard

- [ ] **Step 1: The control**

A labelled file input with `accept=".pdf,.jpg,.jpeg,.png"`, a client-side size check against 5 MB for instant feedback, and the file name plus size shown once chosen. The upload posts `FormData` — `api()` already skips the JSON content-type header when the body is `FormData`.

- [ ] **Step 2: Surface the server's rejection honestly**

The client's `accept` and size check are conveniences. The server verifies magic bytes, so a renamed file is rejected with `415` and the message must be shown as-is:

```tsx
catch (err) {
  if (err instanceof ApiClientError) setError(err.message);
}
```

- [ ] **Step 3: Verify**

Rename a PNG to `.pdf` and upload it: the client accepts it, the server returns `415`, and the message appears under the control. Upload a real PDF: the step advances.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add salary slip upload with server-verified rejection"
```

---

### Task 8: Loan configurator and status page

**Files:**
- Create: `apps/web/features/application/ui/loan-configurator.tsx`, `repayment-bar.tsx`
- Create: `apps/web/features/application/public/status-page.tsx`
- Create: `apps/web/app/apply/status/page.tsx`

**Interfaces:**
- Consumes: `quoteLoan`, `MIN_PRINCIPAL_PAISE`, `MAX_PRINCIPAL_PAISE`, `MIN_TENURE_DAYS`, `MAX_TENURE_DAYS`, `rupeesToPaise`, `LifecycleRail`, `Money`
- Produces: step 4 of the wizard, and `/apply/status`

- [ ] **Step 1: The live quote**

Two native range inputs drive `quoteLoan` on every change — the same function the API stores with, so the figure on screen is the figure in the ledger:

```tsx
const quote = quoteLoan(rupeesToPaise(amountRupees), tenureDays);
```

Render the total with `<Money paise={quote.totalRepayablePaise} />`.

- [ ] **Step 2: The repayment bar**

Two flex segments at true proportion, `2px` gap between them, `4px` rounded outer ends, both direct-labelled with their amounts, and an `aria-label` restating the split for screen readers. Interest gets a `min-width` so it never disappears entirely at thirty days.

Two series are direct-labelled rather than legend-only, so identity never rests on colour.

- [ ] **Step 3: Apply**

`POST /api/loans` with `{ amount, tenureDays }` in rupees. On success, route to `/apply/status`. On `409`, show the message — `ACTIVE_LOAN_EXISTS` and `NOT_ELIGIBLE` both arrive here and both are legitimate states, not errors to hide.

- [ ] **Step 4: The status page**

A server component loading `GET /api/loans/me`, rendering the `LifecycleRail`, the quote breakdown, and the status history as a dated list. When the loan is `REJECTED`, show the reason from the last `statusHistory` entry — that is why the reason is not duplicated onto the loan document.

- [ ] **Step 5: Verify the full journey**

Register a fresh borrower in the browser and walk all four steps through to the status page. Confirm the interest shown for ₹50,000 over 30 days reads **₹493.15** and the total **₹50,493.15**, matching `docs/architecture.md` §4.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the loan configurator with a proportional repayment bar"
```

---

### Task 9: Web boundary rules

**Files:**
- Modify: `dependency-cruiser.cjs`

- [ ] **Step 1: Add the web layer rules**

```js
{
  name: "route-shells-cannot-reach-feature-internals",
  comment: "app/ imports a feature's public entry, never its internals.",
  severity: "error",
  from: { path: "^apps/web/app" },
  to: { path: "^apps/web/features/[^/]+/(?!public(?:/|$))" },
},
{
  name: "web-slices-cannot-cross-import",
  severity: "error",
  from: { path: "^apps/web/features/([^/]+)/" },
  to: { path: "^apps/web/features/(?!$1/)[^/]+/" },
},
{
  name: "components-stay-primitive",
  comment: "Shared primitives must not grow app or feature knowledge.",
  severity: "error",
  from: { path: "^apps/web/components" },
  to: { path: "^apps/web/(app|features)" },
},
```

- [ ] **Step 2: Prove each one bites**

Add a violation for each rule in turn, confirm `pnpm boundaries` fails naming that rule, then remove it. Three rules, three deliberate failures. A rule nobody has seen fail is a rule nobody knows works.

- [ ] **Step 3: Full gate**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries && pnpm --filter @lms/web build
```

The production build is included because Next surfaces server/client boundary errors that `tsc` alone does not.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: enforce web layer boundaries"
```

---

## Definition of done

- [ ] `pnpm lint`, `typecheck`, `test`, `boundaries` pass, and `pnpm --filter @lms/web build` succeeds
- [ ] An anonymous visitor to any protected path lands on `/login`
- [ ] A borrower is redirected away from `/dashboard/*`; an executive is redirected away from `/apply`
- [ ] The eligibility checklist shows all failing rules at once, and correcting them advances the step
- [ ] A PNG renamed `.pdf` is refused by the server and the message is shown to the user
- [ ] Dragging the sliders moves the repayment bar at true proportion; ₹50,000 over 30 days reads ₹493.15 interest
- [ ] The status page shows the lifecycle rail with the current stage marked, and a rejection shows its reason
- [ ] The whole portal holds at 400px wide with no horizontal scroll
- [ ] Each of the three web boundary rules has been observed failing, then restored

**Next:** `04-operations-dashboard.md` — the four modules, the transition workflow, payments and auto-close.
