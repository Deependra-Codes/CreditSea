# AGENTS.md

Engineering rules for this repo. Most are enforced by `pnpm boundaries`, `pnpm lint` and the type system; the rest are here because a build cannot check them.

## Where things live

| Package | Owns | May import |
|---|---|---|
| `packages/domain` | Business rules: money, BRE, loan math, status machine, roles, lead stage | **nothing** |
| `packages/contracts` | zod schemas, response types, the rupees ↔ paise boundary | `domain` |
| `apps/api` | HTTP, persistence, orchestration | `domain`, `contracts` |
| `apps/web` | Rendering and interaction | `domain`, `contracts` |

`packages/domain` has no `dependencies` key. Adding one is the change that breaks the premise the whole system rests on: that the browser and the server run the same rules.

## Non-negotiable

- **Business rules live in `packages/domain`.** A PAN regex, an interest formula or a status edge written anywhere else is a bug, even if it is correct.
- **`loan.status` is written in exactly one file** — `apps/api/src/workflows/transition.service.ts`. Creation sets the initial value; nothing else changes it.
- **Money is integer paise** internally and rupees on the wire. A field named `…Paise` never appears in a payload.
- **Invariants belong in the database** where one exists: unique UTR, one active loan per borrower. An application-level check cannot stop two concurrent requests.
- **401 is not 403.** Unauthenticated and wrongly-authorised are different failures.
- **Guards go on the router**, not on individual routes, so a new route cannot be added unguarded.
- **Never pass a possibly-undefined id to a Mongoose finder.** `findById(undefined)` casts to an empty filter and returns an arbitrary document. Read the user through `requireUser`, params through `pathParam`.

## Boundaries

```
apps/web:   app → features → entities → components / lib
apps/api:   modules → workflows → models / lib / domain
```

Imports go downward only. Slices on the same layer never import each other — they share through the layer below. Folders named `utils`, `helpers`, `misc` or `temp` are banned; they become dumping grounds.

## Size

300 lines per file, 220 per React file, 60 per function. A file outgrowing these is usually doing two jobs.

## Reuse

Prefer duplication over the wrong abstraction. Abstract on the third instance, not the second — with two you cannot tell a real pattern from a coincidence, and undoing a bad abstraction touches every consumer while duplication costs one edit.

**Share truth, not shape.** One invariant in one place is right; merging two things because they look alike today is how the wrong abstraction starts. Sanction and Disbursement are two modules for exactly this reason; the transition guard is one function for the same one.

## Proving a rule

A rule nobody has seen fail is a rule nobody knows works. After adding one, break it deliberately, watch the build fail naming that rule, then restore. Two rules in this repo were silently inert when written — one because `node_modules` was excluded from the dependency graph, another because the `@/` alias did not resolve — and both were only caught by trying to break them.

## Escape hatch

A rule that starts causing friction gets relaxed deliberately and recorded, rather than worked around. Guardrails exist to keep the project clean; the moment they become the project, they have failed.

## Before calling work done

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries && pnpm --filter @lms/web build
```

The gate runs **before** the commit, not after it. Stop the web dev server first — `next build` and `next dev` share `.next` and will corrupt each other's chunks.
