import { STEPS, type WizardStep } from "../model/step";

/** Numbered because this genuinely is a sequence and the user needs to know what remains. */
export function WizardSteps({ current }: { current: WizardStep }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Application progress">
      {STEPS.map((step, index) => {
        const done = step.number < current;
        const active = step.number === current;

        return (
          <li key={step.number} className="flex items-center gap-1">
            {index > 0 && <span className="mr-1 h-px w-4 bg-line" aria-hidden="true" />}
            <span
              className={[
                "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                done
                  ? "bg-good text-white"
                  : active
                    ? "bg-accent text-white"
                    : "bg-line text-ink-3",
              ].join(" ")}
              aria-hidden="true"
            >
              {done ? "✓" : step.number}
            </span>
            <span
              className={`text-xs font-medium ${active ? "text-ink" : done ? "text-ink-2" : "text-ink-3"}`}
            >
              {step.label}
              {active && <span className="sr-only"> (current step)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
