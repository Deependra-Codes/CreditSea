"use client";

import { Button } from "@/components/button";
import { Field, inputClass } from "@/components/field";
import { ApiClientError, api, toFieldErrors } from "@/lib/api";
import type { ProfileResponse } from "@lms/contracts";
import {
  type BreCode,
  type BreResult,
  EMPLOYMENT_MODES,
  type EmploymentMode,
  type Paise,
  calculateAge,
  evaluateBre,
  rupeesToPaise,
} from "@lms/domain";
import { useMemo, useState } from "react";
import { EligibilityChecklist, type RuleState } from "./eligibility-checklist";

const EMPLOYMENT_LABEL: Record<EmploymentMode, string> = {
  SALARIED: "Salaried",
  SELF_EMPLOYED: "Self-employed",
  UNEMPLOYED: "Unemployed",
};

type Draft = {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: string;
  employmentMode: EmploymentMode | "";
};

const draftFrom = (profile: ProfileResponse | null): Draft => ({
  fullName: profile?.fullName ?? "",
  pan: profile?.pan ?? "",
  dateOfBirth: profile?.dateOfBirth?.slice(0, 10) ?? "",
  monthlySalary: profile ? String(profile.monthlySalary) : "",
  employmentMode: profile?.employmentMode ?? "",
});

export function EligibilityForm({
  profile,
  serverBre,
  onPassed,
}: {
  profile: ProfileResponse | null;
  serverBre: BreResult | null;
  onPassed: (profile: ProfileResponse) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [bre, setBre] = useState<BreResult | null>(serverBre);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setBre(null); // an edit invalidates the last verdict until re-checked
  };

  // The same module the API treats as authority. A client check is a
  // convenience, never a control — the server re-evaluates on every write.
  const local = useMemo(() => {
    const salary = Number(draft.monthlySalary);
    const dob = draft.dateOfBirth ? new Date(draft.dateOfBirth) : null;
    if (!dob || Number.isNaN(dob.getTime()) || !draft.employmentMode) return null;

    return evaluateBre({
      pan: draft.pan,
      dateOfBirth: dob,
      monthlySalaryPaise: (Number.isFinite(salary) && salary > 0
        ? rupeesToPaise(salary)
        : 0) as Paise,
      employmentMode: draft.employmentMode,
    });
  }, [draft]);

  const verdict = bre ?? local;
  const filled: Record<BreCode, boolean> = {
    AGE: draft.dateOfBirth !== "",
    SALARY: draft.monthlySalary !== "",
    PAN: draft.pan !== "",
    EMPLOYMENT: draft.employmentMode !== "",
  };

  const failed = new Set(verdict?.failures.map((failure) => failure.code));
  const states = Object.fromEntries(
    (Object.keys(filled) as BreCode[]).map((code) => [
      code,
      !verdict || !filled[code] ? "pending" : failed.has(code) ? "fail" : "pass",
    ]),
  ) as Record<BreCode, RuleState>;

  const age =
    draft.dateOfBirth && !Number.isNaN(new Date(draft.dateOfBirth).getTime())
      ? calculateAge(new Date(draft.dateOfBirth), new Date())
      : null;

  const detail: Partial<Record<BreCode, string>> = {
    ...(age !== null ? { AGE: `you are ${age}` } : {}),
    ...(draft.monthlySalary
      ? { SALARY: `₹${Number(draft.monthlySalary).toLocaleString("en-IN")}` }
      : {}),
    ...(draft.pan ? { PAN: draft.pan.toUpperCase() } : {}),
    ...(draft.employmentMode ? { EMPLOYMENT: EMPLOYMENT_LABEL[draft.employmentMode] } : {}),
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await api<{ profile: ProfileResponse; bre: BreResult }>(
        "/api/application/profile",
        {
          method: "PUT",
          body: JSON.stringify({
            fullName: draft.fullName,
            pan: draft.pan,
            dateOfBirth: draft.dateOfBirth,
            monthlySalary: Number(draft.monthlySalary),
            employmentMode: draft.employmentMode,
          }),
        },
      );
      // A rejection arrives as a 200 with failures, not as a thrown error:
      // the details were saved and this screen is where they get corrected.
      setBre(result.bre);
      if (result.bre.passed) onPassed(result.profile);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        if (error.code === "VALIDATION_FAILED") setFieldErrors(toFieldErrors(error.details));
      } else {
        setFormError("Could not reach the server.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="p-name" error={fieldErrors.fullName}>
          <input
            id="p-name"
            required
            className={inputClass}
            value={draft.fullName}
            onChange={(event) => set("fullName", event.target.value)}
          />
        </Field>

        <Field
          label="PAN"
          htmlFor="p-pan"
          hint="Ten characters, e.g. ABCDE1234F"
          error={fieldErrors.pan}
        >
          <input
            id="p-pan"
            required
            maxLength={10}
            className={`${inputClass} font-mono uppercase`}
            value={draft.pan}
            onChange={(event) => set("pan", event.target.value.toUpperCase())}
          />
        </Field>

        <Field label="Date of birth" htmlFor="p-dob" error={fieldErrors.dateOfBirth}>
          <input
            id="p-dob"
            type="date"
            required
            className={inputClass}
            value={draft.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
        </Field>

        <Field label="Monthly salary (₹)" htmlFor="p-salary" error={fieldErrors.monthlySalary}>
          <input
            id="p-salary"
            type="number"
            min={1}
            required
            className={`${inputClass} font-mono tabular-nums`}
            value={draft.monthlySalary}
            onChange={(event) => set("monthlySalary", event.target.value)}
          />
        </Field>

        <Field label="Employment" htmlFor="p-employment" error={fieldErrors.employmentMode}>
          <select
            id="p-employment"
            required
            className={inputClass}
            value={draft.employmentMode}
            onChange={(event) => set("employmentMode", event.target.value as EmploymentMode)}
          >
            <option value="" disabled>
              Select…
            </option>
            {EMPLOYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {EMPLOYMENT_LABEL[mode]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.09em] text-ink-3">
          Eligibility
        </h2>
        <EligibilityChecklist states={states} detail={detail} />
      </div>

      {formError && (
        <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
          {formError}
        </p>
      )}

      {bre && !bre.passed && (
        <p role="status" className="text-sm text-ink-2">
          Your details are saved. Correct the rules above and check again — nothing is lost.
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Checking…" : "Check eligibility"}
      </Button>
    </form>
  );
}
