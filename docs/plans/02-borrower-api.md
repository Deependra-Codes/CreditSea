# Borrower API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the borrower's server-side journey — personal details evaluated by the BRE, a salary slip uploaded and served safely, and a loan created with a correct quote — so the portal UI in plan 03 has a working API behind it.

**Architecture:** Two new API modules (`application`, `loan`) plus one pure-function addition to `packages/domain` for loan visibility. Business rules stay in the domain package; the modules are thin glue over Mongoose. File validation is a pure function over a buffer, so it is unit-testable without touching disk.

**Tech Stack:** Express 5 · Mongoose 8 · multer 2 (memory storage) · zod 4 · vitest

**Spec:** `docs/architecture.md`

**Preceded by:** `docs/plans/01-foundation.md`

## Global Constraints

Everything in plan 01's Global Constraints still applies. In addition:

- Business rules live in `packages/domain`; API modules never re-implement one.
- Sibling modules may not import each other — shared orchestration goes in `apps/api/src/workflows/`.
- Uploads: 5 MB, `.pdf/.jpg/.jpeg/.png`, verified by magic bytes, stored under a server-generated UUID name, served only through an authenticated route.
- A file name ending in `Paise` is integer paise and never appears in a payload.
- Naming: the folder supplies the category, the file supplies the specific thing (`modules/loan/service.ts`, not `loan.service.ts`).

---

## Two design corrections this plan makes

Both were found while working through the flow; they are deviations from `docs/architecture.md` §10 and should be read before implementing.

**1. A BRE rejection is a `200`, not a `422`.**

The spec's route table lists `200, 422` for `PUT /api/application/profile` without saying which failure gets which. The distinction matters:

- `422` means *the request was malformed* — a missing field, a non-date date. Nothing was saved.
- A BRE rejection means *the request was fine and we saved it*; the applicant is simply not eligible yet.

Those are different events and the client renders them differently. So the profile is always saved, and the response carries `{ profile, bre }` with `bre.passed: false` and every failure listed. Spec §2 already requires a rejected borrower to be able to retry, which is only possible if the profile persisted.

**2. The PAN regex moves out of the zod schema, leaving the BRE as sole owner.**

`profileSchema` currently applies `PAN_FORMAT`, which means a malformed PAN is rejected by zod before the BRE ever runs — so `BRE_RULES`' PAN rule is dead code on this route, and PAN errors reach the client in a different shape (`error.details[]`) from the other three (`bre.failures[]`).

The schema now validates *shape* (a trimmed, uppercased, 10-character string) and the BRE owns the *rule*. All four eligibility failures then come back through one array in one shape, and the frontend renders them with one component.

---

### Task 1: Loan visibility as a domain rule

Spec §9 defines who may read a loan in four clauses. It is a rule about roles and statuses, so it belongs in the domain package where it can be tested without a database.

**Files:**
- Create: `packages/domain/src/loan/visibility.ts`
- Test: `packages/domain/src/loan/visibility.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Consumes: `Role`, `LoanStatus`, `QUEUE_STATUS` from plan 01
- Produces: `canViewLoan(viewer: LoanViewer, loan: ViewableLoan): boolean` where
  `LoanViewer = { id: string; role: Role }` and
  `ViewableLoan = { borrowerId: string; status: LoanStatus; actedRoles: readonly Role[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { canViewLoan } from "./visibility";

const loan = (over: Partial<Parameters<typeof canViewLoan>[1]> = {}) => ({
  borrowerId: "borrower-1",
  status: "APPLIED" as const,
  actedRoles: [] as const,
  ...over,
});

describe("canViewLoan", () => {
  it("lets the owning borrower read their own loan", () => {
    expect(canViewLoan({ id: "borrower-1", role: "BORROWER" }, loan())).toBe(true);
  });

  it("refuses a different borrower", () => {
    expect(canViewLoan({ id: "borrower-2", role: "BORROWER" }, loan())).toBe(false);
  });

  it("lets ADMIN read anything", () => {
    expect(canViewLoan({ id: "a", role: "ADMIN" }, loan({ status: "CLOSED" }))).toBe(true);
  });

  it("lets an executive read a loan sitting in their queue", () => {
    expect(canViewLoan({ id: "e", role: "SANCTION" }, loan({ status: "APPLIED" }))).toBe(true);
    expect(canViewLoan({ id: "e", role: "DISBURSEMENT" }, loan({ status: "SANCTIONED" }))).toBe(true);
    expect(canViewLoan({ id: "e", role: "COLLECTION" }, loan({ status: "DISBURSED" }))).toBe(true);
  });

  it("refuses an executive whose queue the loan is not in", () => {
    expect(canViewLoan({ id: "e", role: "DISBURSEMENT" }, loan({ status: "APPLIED" }))).toBe(false);
    expect(canViewLoan({ id: "e", role: "COLLECTION" }, loan({ status: "SANCTIONED" }))).toBe(false);
  });

  // Clause 4: an executive keeps sight of a loan they moved.
  it("lets an executive follow a loan they previously acted on", () => {
    const moved = loan({ status: "DISBURSED", actedRoles: ["SANCTION"] });
    expect(canViewLoan({ id: "e", role: "SANCTION" }, moved)).toBe(true);
  });

  // SALES works the pre-application stage and must never see loan financials.
  it("refuses SALES in every case", () => {
    for (const status of ["APPLIED", "SANCTIONED", "DISBURSED", "CLOSED", "REJECTED"] as const) {
      expect(canViewLoan({ id: "s", role: "SALES" }, loan({ status }))).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm --filter @lms/domain test visibility
```

Expected: FAIL — `Cannot find module './visibility'`.

- [ ] **Step 3: Implement**

```ts
import type { Role } from "../rbac/roles";
import { QUEUE_STATUS, type LoanStatus } from "./transitions";

export type LoanViewer = { id: string; role: Role };

/** `actedRoles` comes from the loan's statusHistory; kept as data so this stays pure. */
export type ViewableLoan = {
  borrowerId: string;
  status: LoanStatus;
  actedRoles: readonly Role[];
};

/**
 * Loans carry PAN, salary and repayment data, so "any executive" is too broad.
 * A viewer qualifies by ownership, by ADMIN, by the loan being in their queue,
 * or by having moved it earlier.
 */
export function canViewLoan(viewer: LoanViewer, loan: ViewableLoan): boolean {
  if (viewer.role === "ADMIN") return true;
  if (viewer.id === loan.borrowerId) return true;

  const queued = (QUEUE_STATUS as Partial<Record<Role, LoanStatus>>)[viewer.role];
  if (queued !== undefined && queued === loan.status) return true;

  return loan.actedRoles.includes(viewer.role);
}
```

- [ ] **Step 4: Export it and confirm green**

Add `export * from "./loan/visibility";` to `packages/domain/src/index.ts`, then:

```bash
pnpm --filter @lms/domain test
pnpm typecheck
```

Expected: PASS, 7 new tests.

- [ ] **Step 5: Commit**

```bash
git add packages/domain
git commit -m "feat(domain): add loan visibility rule with four qualifying clauses"
```

---

### Task 2: Upload validation as a pure function

Validating an upload means inspecting bytes, which needs no filesystem and no Express. Keeping it pure makes the security checks directly testable.

**Files:**
- Create: `apps/api/src/lib/file-type.ts`
- Test: `apps/api/src/lib/file-type.test.ts`

**Interfaces:**
- Produces:
  - `MAX_UPLOAD_BYTES = 5 * 1024 * 1024`
  - `ALLOWED_UPLOADS` — extension, mime and magic-byte prefix per accepted type
  - `detectFileType(buffer: Buffer): AllowedFileType | null`
  - `assertUploadAllowed(file: { buffer: Buffer; mimetype: string; originalname: string }): AllowedFileType` — throws `HttpError` 415

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { HttpError } from "./http-error";
import { assertUploadAllowed, detectFileType } from "./file-type";

const pdf = Buffer.from("255044462d312e34", "hex");        // %PDF-1.4
const jpeg = Buffer.from("ffd8ffe000104a464946", "hex");
const png = Buffer.from("89504e470d0a1a0a0000000d", "hex");
const html = Buffer.from("<!doctype html><script>", "utf8");

const upload = (buffer: Buffer, mimetype: string, originalname: string) => ({
  buffer,
  mimetype,
  originalname,
});

describe("detectFileType", () => {
  it("identifies each accepted type by its magic bytes", () => {
    expect(detectFileType(pdf)).toBe("pdf");
    expect(detectFileType(jpeg)).toBe("jpeg");
    expect(detectFileType(png)).toBe("png");
  });

  it("returns null for anything else, including an empty buffer", () => {
    expect(detectFileType(html)).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe("assertUploadAllowed", () => {
  it("accepts a well-formed upload", () => {
    expect(assertUploadAllowed(upload(pdf, "application/pdf", "slip.pdf"))).toBe("pdf");
  });

  // The declared mimetype is a client claim; the bytes are the evidence.
  it("rejects a script disguised with a PDF name and mimetype", () => {
    const error = (() => {
      try {
        assertUploadAllowed(upload(html, "application/pdf", "slip.pdf"));
      } catch (e) {
        return e as HttpError;
      }
    })();
    expect(error?.status).toBe(415);
  });

  it("rejects a real PNG carrying a disallowed extension", () => {
    expect(() => assertUploadAllowed(upload(png, "image/png", "slip.exe"))).toThrow();
  });

  it("rejects content that disagrees with its extension", () => {
    expect(() => assertUploadAllowed(upload(png, "application/pdf", "slip.pdf"))).toThrow();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm --filter @lms/api test file-type
```

Expected: FAIL — `Cannot find module './file-type'`.

- [ ] **Step 3: Implement**

```ts
import path from "node:path";
import { HttpError } from "./http-error";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_ORIGINAL_NAME_LENGTH = 255;

export type AllowedFileType = "pdf" | "jpeg" | "png";

type UploadSpec = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  magic: readonly number[];
};

export const ALLOWED_UPLOADS = {
  pdf: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    magic: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  jpeg: {
    extensions: [".jpg", ".jpeg"],
    mimeTypes: ["image/jpeg"],
    magic: [0xff, 0xd8, 0xff],
  },
  png: {
    extensions: [".png"],
    mimeTypes: ["image/png"],
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
} as const satisfies Record<AllowedFileType, UploadSpec>;

const startsWith = (buffer: Buffer, magic: readonly number[]) =>
  buffer.length >= magic.length && magic.every((byte, i) => buffer[i] === byte);

/** Identifies a file by its content. A declared mimetype is a claim, not evidence. */
export function detectFileType(buffer: Buffer): AllowedFileType | null {
  for (const [type, spec] of Object.entries(ALLOWED_UPLOADS)) {
    if (startsWith(buffer, spec.magic)) return type as AllowedFileType;
  }
  return null;
}

export function assertUploadAllowed(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}): AllowedFileType {
  const reject = () =>
    new HttpError(415, "UNSUPPORTED_FILE", "Upload a PDF, JPG or PNG file.");

  const detected = detectFileType(file.buffer);
  if (detected === null) throw reject();

  const spec = ALLOWED_UPLOADS[detected];
  const extension = path.extname(file.originalname).toLowerCase();

  // All three must agree: content, extension, and declared type.
  if (!spec.extensions.includes(extension)) throw reject();
  if (!spec.mimeTypes.includes(file.mimetype)) throw reject();

  return detected;
}
```

- [ ] **Step 4: Run it and confirm green**

```bash
pnpm --filter @lms/api test file-type
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): validate uploads by magic bytes, not the declared mimetype"
```

---

### Task 3: Application module — profile and BRE

**Files:**
- Create: `apps/api/src/modules/application/service.ts`, `controller.ts`, `routes.ts`
- Modify: `packages/contracts/src/application.ts` (drop the PAN regex — see design correction 2)
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `profileSchema`, `evaluateBre`, `BorrowerProfile`, `Loan`, `authenticate`, `authorize`, `validate`
- Produces:
  - `saveProfile(userId, input): Promise<{ profile, bre }>`
  - `getApplication(userId): Promise<{ profile, activeLoan }>`
  - Routes `GET /api/application/me`, `PUT /api/application/profile`

- [ ] **Step 1: Let the BRE own the PAN rule**

In `packages/contracts/src/application.ts`, replace the regex check with a shape check:

```ts
  // Shape only. The BRE owns the PAN rule, so all four eligibility failures
  // reach the client in one array with one shape.
  pan: z.string().trim().toUpperCase().length(10),
```

Drop the now-unused `PAN_FORMAT` import.

- [ ] **Step 2: Implement the service**

`apps/api/src/modules/application/service.ts`:

```ts
import type { ProfileInput } from "@lms/contracts";
import { ACTIVE_LOAN_STATUSES, type Paise, evaluateBre } from "@lms/domain";
import { BorrowerProfile } from "../../models/borrower-profile";
import { Loan } from "../../models/loan";

/**
 * The profile is saved even when the BRE rejects it: spec §2 requires a
 * rejected applicant to fix their details and retry, which needs the record
 * to persist. Eligibility is an outcome carried in the response, not an error.
 */
export async function saveProfile(userId: string, input: ProfileInput) {
  const bre = evaluateBre({
    pan: input.pan,
    dateOfBirth: input.dateOfBirth,
    monthlySalaryPaise: input.monthlySalary as Paise,
    employmentMode: input.employmentMode,
  });

  const profile = await BorrowerProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        fullName: input.fullName,
        pan: input.pan,
        dateOfBirth: input.dateOfBirth,
        monthlySalaryPaise: input.monthlySalary,
        employmentMode: input.employmentMode,
        bre: { ...bre, evaluatedAt: new Date() },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { profile, bre };
}

export async function getApplication(userId: string) {
  const [profile, activeLoan] = await Promise.all([
    BorrowerProfile.findOne({ userId }),
    Loan.findOne({ borrowerId: userId, status: { $in: ACTIVE_LOAN_STATUSES } }),
  ]);
  return { profile, activeLoan };
}
```

- [ ] **Step 3: Implement the controller**

`apps/api/src/modules/application/controller.ts`:

```ts
import { type ProfileInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { validated } from "../../middleware/validate";
import { getApplication, saveProfile } from "./service";

const requireUser = (req: Request) => {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
};

export async function readApplication(req: Request, res: Response) {
  res.json(ok(await getApplication(requireUser(req).id)));
}

export async function updateProfile(req: Request, res: Response) {
  const input = validated<ProfileInput>(req);
  res.json(ok(await saveProfile(requireUser(req).id, input)));
}
```

`requireUser` exists because `findOne({ userId: undefined })` matches everything — the same fail-open that was fixed in `auth`'s `me`. Every controller reading `req.user` goes through it.

- [ ] **Step 4: Implement the routes and mount them**

`apps/api/src/modules/application/routes.ts`:

```ts
import { profileSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { readApplication, updateProfile } from "./controller";

export const applicationRoutes = Router();

applicationRoutes.use(authenticate, authorize("BORROWER"));
applicationRoutes.get("/me", readApplication);
applicationRoutes.put("/profile", validate(profileSchema), updateProfile);
```

`Router.use` applies both guards to every route in the module, so a new route cannot be added unguarded by accident.

In `apps/api/src/app.ts`, mount above `notFound`:

```ts
app.use("/api/application", applicationRoutes);
```

- [ ] **Step 5: Verify against the running server**

```bash
pnpm --filter @lms/api dev
```

```bash
# borrower logs in
curl -s -c /tmp/b.jar -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"borrower@lms.test","password":"Password@123"}' > /dev/null

# eligible applicant -> bre.passed true
curl -s -b /tmp/b.jar -X PUT http://localhost:4000/api/application/profile \
  -H 'content-type: application/json' \
  -d '{"fullName":"Demo Borrower","pan":"ABCDE1234F","dateOfBirth":"1995-01-01","monthlySalary":30000,"employmentMode":"SALARIED"}'

# unemployed and underpaid and too young -> three failures, still 200
curl -s -b /tmp/b.jar -X PUT http://localhost:4000/api/application/profile \
  -H 'content-type: application/json' \
  -d '{"fullName":"Demo Borrower","pan":"ABCDE1234F","dateOfBirth":"2010-01-01","monthlySalary":9000,"employmentMode":"UNEMPLOYED"}'

# an executive must be refused this borrower-only module
curl -s -o /dev/null -w '%{http_code}\n' -c /tmp/s.jar -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' -d '{"email":"sanction@lms.test","password":"Password@123"}'
curl -s -w ' <- expect 403\n' -b /tmp/s.jar http://localhost:4000/api/application/me
```

Expected: first call `bre.passed: true` with `failures: []`; second `200` with `bre.passed: false` and exactly `AGE`, `SALARY`, `EMPLOYMENT`; third `403`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): add application module with server-authoritative BRE"
```

---

### Task 4: Salary slip upload and protected download

**Files:**
- Create: `apps/api/src/middleware/upload.ts`
- Create: `apps/api/src/modules/files/service.ts`, `controller.ts`, `routes.ts`
- Modify: `apps/api/src/modules/application/controller.ts`, `routes.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `assertUploadAllowed`, `MAX_UPLOAD_BYTES`, `env.UPLOAD_DIR`, `BorrowerProfile`
- Produces:
  - `uploadSingle` — multer memory-storage middleware capped at 5 MB
  - `storeSalarySlip(userId, file): Promise<SalarySlip>`
  - `readSalarySlip(userId): Promise<{ slip, body }>`
  - Routes `POST /api/application/salary-slip`, `GET /api/files/salary-slip/:userId`

- [ ] **Step 1: Implement the multer middleware**

`apps/api/src/middleware/upload.ts`:

```ts
import multer from "multer";
import { MAX_UPLOAD_BYTES } from "../lib/file-type";

// Memory storage so the bytes can be inspected before anything touches disk.
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single("file");
```

- [ ] **Step 2: Implement the file service**

`apps/api/src/modules/files/service.ts`:

```ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../lib/env";
import { ALLOWED_UPLOADS, MAX_ORIGINAL_NAME_LENGTH, assertUploadAllowed } from "../../lib/file-type";
import { HttpError } from "../../lib/http-error";
import { BorrowerProfile } from "../../models/borrower-profile";

const uploadDir = () => path.resolve(env.UPLOAD_DIR);

export async function storeSalarySlip(
  userId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
) {
  const type = assertUploadAllowed(file);

  // The stored name is server-generated, so user input never reaches a path
  // and traversal is impossible by construction rather than by sanitising.
  const storedName = `${randomUUID()}${ALLOWED_UPLOADS[type].extensions[0]}`;

  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), storedName), file.buffer);

  const salarySlip = {
    storedName,
    originalName: file.originalname.slice(0, MAX_ORIGINAL_NAME_LENGTH),
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };

  const profile = await BorrowerProfile.findOneAndUpdate(
    { userId },
    { $set: { salarySlip } },
    { new: true },
  );
  if (!profile) throw HttpError.notFound("Profile");

  return salarySlip;
}

export async function readSalarySlip(userId: string) {
  const profile = await BorrowerProfile.findOne({ userId });
  if (!profile?.salarySlip) throw HttpError.notFound("Salary slip");

  const absolutePath = path.join(uploadDir(), profile.salarySlip.storedName);
  return { slip: profile.salarySlip, body: await readFile(absolutePath) };
}
```

- [ ] **Step 3: Wire the upload route into the application module**

Add to `apps/api/src/modules/application/controller.ts`:

```ts
export async function uploadSalarySlip(req: Request, res: Response) {
  if (!req.file) throw new HttpError(422, "FILE_REQUIRED", "Attach a salary slip.");
  res.status(201).json(ok({ salarySlip: await storeSalarySlip(requireUser(req).id, req.file) }));
}
```

Add to `apps/api/src/modules/application/routes.ts`:

```ts
applicationRoutes.post("/salary-slip", uploadSingle, uploadSalarySlip);
```

- [ ] **Step 4: Implement the protected download**

`apps/api/src/modules/files/controller.ts`:

```ts
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { readSalarySlip } from "./service";

/**
 * Serving uploads statically would make possession of a URL enough to read a
 * stranger's salary slip, so every read goes through this check.
 */
export async function downloadSalarySlip(req: Request, res: Response) {
  const viewer = req.user;
  if (!viewer) throw HttpError.unauthorized();

  const ownerId = req.params.userId;
  if (!ownerId) throw HttpError.notFound("Salary slip");
  const isOwner = viewer.id === ownerId;
  const isReviewer = ["ADMIN", "SANCTION", "DISBURSEMENT", "COLLECTION"].includes(viewer.role);
  if (!isOwner && !isReviewer) throw HttpError.forbidden();

  const { slip, body } = await readSalarySlip(ownerId);
  res.setHeader("Content-Type", slip.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(slip.originalName)}"`);
  res.send(body);
}
```

`apps/api/src/modules/files/routes.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { downloadSalarySlip } from "./controller";

export const fileRoutes = Router();

fileRoutes.use(authenticate);
fileRoutes.get("/salary-slip/:userId", downloadSalarySlip);
```

Mount in `app.ts`: `app.use("/api/files", fileRoutes);`

- [ ] **Step 5: Verify, including the rejections**

```bash
# a real PNG renamed to .pdf must be refused on content, not trusted on name
printf '\x89PNG\r\n\x1a\n' > /tmp/fake.pdf
curl -s -b /tmp/b.jar -F 'file=@/tmp/fake.pdf;type=application/pdf' \
  http://localhost:4000/api/application/salary-slip

# a genuine PDF is accepted
printf '%%PDF-1.4\n' > /tmp/slip.pdf
curl -s -b /tmp/b.jar -F 'file=@/tmp/slip.pdf;type=application/pdf' \
  http://localhost:4000/api/application/salary-slip

# an anonymous reader must not reach it
curl -s -o /dev/null -w '%{http_code} <- expect 401\n' \
  http://localhost:4000/api/files/salary-slip/<borrowerId>
```

Expected: `415 UNSUPPORTED_FILE`, then `201` with a `storedName` that is a UUID, then `401`.

Confirm the file landed with a generated name and that `uploads/` is ignored:

```bash
ls uploads/ && git check-ignore -v uploads/
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): store salary slips under generated names behind an auth check"
```

---

### Task 5: Loan creation

**Files:**
- Create: `apps/api/src/modules/loan/service.ts`, `controller.ts`, `routes.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `createLoanSchema`, `quoteLoan`, `canViewLoan`, `Loan`, `BorrowerProfile`
- Produces:
  - `createLoan(userId, input): Promise<LoanDoc>`
  - `listBorrowerLoans(userId)`, `getLoanForViewer(viewer, loanId)`
  - Routes `POST /api/loans`, `GET /api/loans/me`, `GET /api/loans/:id`

- [ ] **Step 1: Implement the service**

`apps/api/src/modules/loan/service.ts`:

```ts
import type { CreateLoanInput } from "@lms/contracts";
import { type LoanViewer, type Paise, canViewLoan, quoteLoan } from "@lms/domain";
import type { Role } from "@lms/domain";
import { HttpError } from "../../lib/http-error";
import { BorrowerProfile } from "../../models/borrower-profile";
import { Loan } from "../../models/loan";
import { Payment } from "../../models/payment";

export async function createLoan(userId: string, input: CreateLoanInput) {
  const profile = await BorrowerProfile.findOne({ userId });
  if (!profile) {
    throw new HttpError(409, "PROFILE_REQUIRED", "Complete your personal details first.");
  }
  if (!profile.bre.passed) {
    throw new HttpError(409, "NOT_ELIGIBLE", "Your application did not pass the eligibility check.");
  }
  if (!profile.salarySlip) {
    throw new HttpError(409, "SALARY_SLIP_REQUIRED", "Upload your salary slip first.");
  }

  const quote = quoteLoan(input.amount as Paise, input.tenureDays);

  try {
    return await Loan.create({
      borrowerId: userId,
      activeBorrowerId: userId,
      snapshot: {
        fullName: profile.fullName,
        pan: profile.pan,
        dateOfBirth: profile.dateOfBirth,
        monthlySalaryPaise: profile.monthlySalaryPaise,
        employmentMode: profile.employmentMode,
      },
      ...quote,
      outstandingPaise: quote.totalRepayablePaise,
      status: "APPLIED",
      appliedAt: new Date(),
    });
  } catch (err) {
    // The partial unique index on activeBorrowerId is what actually enforces
    // one active loan; translate its duplicate-key error into a useful message.
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "ACTIVE_LOAN_EXISTS", "You already have a loan in progress.");
    }
    throw err;
  }
}

export const listBorrowerLoans = (userId: string) =>
  Loan.find({ borrowerId: userId }).sort({ appliedAt: -1 });

export async function getLoanForViewer(viewer: LoanViewer, loanId: string) {
  const loan = await Loan.findById(loanId);
  if (!loan) throw HttpError.notFound("Loan");

  const actedRoles = loan.statusHistory.map((event) => event.byRole as Role);
  if (!canViewLoan(viewer, { borrowerId: String(loan.borrowerId), status: loan.status, actedRoles })) {
    throw HttpError.forbidden();
  }

  const payments = await Payment.find({ loanId: loan._id }).sort({ paidAt: -1 });
  return { loan, payments };
}
```

- [ ] **Step 2: Implement the controller and routes**

`apps/api/src/modules/loan/controller.ts`:

```ts
import { type CreateLoanInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { validated } from "../../middleware/validate";
import { createLoan, getLoanForViewer, listBorrowerLoans } from "./service";

const requireUser = (req: Request) => {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
};

export async function apply(req: Request, res: Response) {
  const loan = await createLoan(requireUser(req).id, validated<CreateLoanInput>(req));
  res.status(201).json(ok({ loan }));
}

export async function myLoans(req: Request, res: Response) {
  res.json(ok({ loans: await listBorrowerLoans(requireUser(req).id) }));
}

export async function loanDetail(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) throw HttpError.notFound("Loan");
  res.json(ok(await getLoanForViewer(requireUser(req), id)));
}
```

`apps/api/src/modules/loan/routes.ts`:

```ts
import { createLoanSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { apply, loanDetail, myLoans } from "./controller";

export const loanRoutes = Router();

loanRoutes.use(authenticate);
loanRoutes.post("/", authorize("BORROWER"), validate(createLoanSchema), apply);
loanRoutes.get("/me", authorize("BORROWER"), myLoans);
// Any signed-in role may ask; canViewLoan decides per loan.
loanRoutes.get("/:id", loanDetail);
```

Mount in `app.ts`: `app.use("/api/loans", loanRoutes);`

`GET /:id` is registered after `/me` so the literal path wins; otherwise `/me` would be captured as an id.

- [ ] **Step 3: Verify the whole borrower path**

```bash
# with an eligible profile and a slip on file
curl -s -b /tmp/b.jar -X POST http://localhost:4000/api/loans \
  -H 'content-type: application/json' -d '{"amount":50000,"tenureDays":30}'

# a second application must be refused while the first is active
curl -s -b /tmp/b.jar -X POST http://localhost:4000/api/loans \
  -H 'content-type: application/json' -d '{"amount":80000,"tenureDays":60}'

# out-of-range amount is a validation failure, not a 500
curl -s -b /tmp/b.jar -X POST http://localhost:4000/api/loans \
  -H 'content-type: application/json' -d '{"amount":49999,"tenureDays":30}'

# SALES must not be able to read the loan
curl -s -o /dev/null -w '%{http_code} <- expect 403\n' -b /tmp/s.jar \
  http://localhost:4000/api/loans/<loanId>
```

Expected, in order: `201` with `interestPaise: 49315` and `totalRepayablePaise: 5049315`; `409 ACTIVE_LOAN_EXISTS`; `422 VALIDATION_FAILED`; `403`.

The interest figures must match the anchors in `docs/architecture.md` §4 exactly — that is the loan math arriving intact through the whole stack.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): add loan creation guarded by eligibility and the active-loan index"
```

---

### Task 6: Boundary rules for the new modules

**Files:**
- Modify: `dependency-cruiser.cjs`

- [ ] **Step 1: Confirm the existing rules still hold**

```bash
pnpm boundaries
```

Expected: no violations. `api-modules-cannot-cross-import` now has four modules to police rather than one, so this run is the first that meaningfully exercises it.

- [ ] **Step 2: Prove the cross-import rule bites**

Temporarily add to `apps/api/src/modules/loan/service.ts`:

```ts
import { saveProfile } from "../application/service"; // deliberate violation
```

```bash
pnpm boundaries
```

Expected: FAIL on `api-modules-cannot-cross-import`. **Remove the line** and re-run.

A rule that has never been seen failing is a rule nobody knows works — and this one was written in plan 01 against modules that did not yet exist.

- [ ] **Step 3: Run the full gate**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify module boundary rules against the new API modules"
```

---

## Definition of done

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm boundaries` all pass
- [ ] A borrower can save personal details, be told exactly which eligibility rules failed, fix them, and pass
- [ ] A BRE rejection returns `200` with every failure listed, and the profile persists so it can be corrected
- [ ] A PNG renamed `.pdf` is refused with `415`; a genuine PDF is stored under a UUID name
- [ ] An anonymous request for a salary slip returns `401`; another borrower's returns `403`
- [ ] Applying returns `interestPaise: 49315` for ₹50,000 over 30 days, matching `docs/architecture.md` §4
- [ ] A second application while one is active returns `409 ACTIVE_LOAN_EXISTS`
- [ ] `SALES` cannot read any loan; the owning borrower and the queue-holding executive can
- [ ] The module cross-import rule has been observed failing, then restored

**Next:** `03-borrower-portal.md` — the Next.js app and the four-step wizard, which turns this API into the first demonstrable end-to-end path.
