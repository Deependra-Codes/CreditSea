import type { ProfileResponse } from "@lms/contracts";
import { CheckCircle2, Circle, Lock, ShieldCheck } from "lucide-react";
import { STEPS, type WizardStep } from "../model/step";

const DETAIL: Record<number, string> = {
  1: "Your account is created.",
  2: "Name, PAN, date of birth, salary and employment.",
  3: "A recent payslip, up to 5 MB.",
  4: "Choose your amount and tenure, then apply.",
};

/**
 * Fills the space beside the form with something worth reading: where you are,
 * what is still coming, and what we already hold. An empty column teaches
 * nothing and makes a short form look like a mistake.
 */
export function WizardAside({
  current,
  profile,
}: {
  current: WizardStep;
  profile: ProfileResponse | null;
}) {
  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-card bg-canvas p-5 ring-1 ring-line">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-3">
          Your application
        </h2>
        <ol className="flex flex-col">
          {STEPS.map((step, index) => {
            const done = step.number < current;
            const active = step.number === current;

            return (
              <li key={step.number} className="flex gap-3">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-good" aria-hidden />
                  ) : active ? (
                    <Circle className="size-4 shrink-0 fill-accent/20 text-accent" aria-hidden />
                  ) : (
                    <Circle className="size-4 shrink-0 text-ink-3/50" aria-hidden />
                  )}
                  {index < STEPS.length - 1 && <span className="w-px flex-1 bg-line" />}
                </div>
                <div className="flex flex-col pb-4">
                  <span
                    className={`text-sm font-bold ${active ? "text-ink" : done ? "text-ink-2" : "text-ink-3"}`}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-ink-3">{DETAIL[step.number]}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {profile?.salarySlip && (
        <section className="flex items-start gap-3 rounded-card bg-canvas p-4 ring-1 ring-line">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
          <div className="flex flex-col">
            <span className="text-xs font-bold">Salary slip on file</span>
            <span className="font-mono text-[11px] text-ink-3">
              {profile.salarySlip.originalName}
            </span>
          </div>
        </section>
      )}

      <section className="flex items-start gap-3 rounded-card bg-canvas p-4 ring-1 ring-line">
        <Lock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p className="text-xs text-ink-2">
          Your PAN and salary slip are visible only to you and the executive reviewing your loan.
        </p>
      </section>
    </aside>
  );
}
