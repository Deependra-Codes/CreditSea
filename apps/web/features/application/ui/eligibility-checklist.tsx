import { BRE_RULES, type BreCode } from "@lms/domain";
import { Check, X } from "lucide-react";

export type RuleState = "pending" | "pass" | "fail";

/**
 * Iterates BRE_RULES rather than listing four rows, so a fifth rule added to the
 * domain appears here with no edit and cannot silently go unshown.
 */
export function EligibilityChecklist({
  states,
  detail,
}: {
  states: Record<BreCode, RuleState>;
  detail: Partial<Record<BreCode, string>>;
}) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Eligibility rules">
      {BRE_RULES.map((rule) => {
        const state = states[rule.code];

        return (
          <li
            key={rule.code}
            className={[
              "grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-ctrl px-3 py-2",
              "transition-[box-shadow,background-color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              state === "fail"
                ? "bg-critical/5 ring-1 ring-critical/30"
                : "bg-canvas ring-1 ring-line-soft",
            ].join(" ")}
          >
            <span
              className={[
                "grid size-[18px] place-items-center rounded-full text-canvas transition-colors duration-200",
                state === "pass" ? "bg-good" : "",
                state === "fail" ? "bg-critical" : "",
                state === "pending" ? "bg-transparent ring-2 ring-line ring-inset" : "",
              ].join(" ")}
              aria-hidden
            >
              {state === "pass" && <Check className="size-3 stroke-[3]" />}
              {state === "fail" && <X className="size-3 stroke-[3]" />}
            </span>

            <span className={`text-[13px] ${state === "pending" ? "text-ink-3" : ""}`}>
              {rule.message}
            </span>

            {detail[rule.code] && (
              <span
                className={`font-mono text-xs ${
                  state === "fail" ? "font-medium text-critical" : "text-ink-3"
                }`}
              >
                {detail[rule.code]}
              </span>
            )}

            <span className="sr-only">
              {state === "pass" ? "met" : state === "fail" ? "not met" : "not yet checked"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
