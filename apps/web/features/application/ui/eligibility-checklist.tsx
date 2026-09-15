import { BRE_RULES, type BreCode } from "@lms/domain";

export type RuleState = "pending" | "pass" | "fail";

const GLYPH: Record<RuleState, { mark: string; box: string; text: string }> = {
  pending: { mark: "", box: "border-2 border-line-2 bg-canvas", text: "text-ink-3" },
  pass: { mark: "✓", box: "bg-good text-white", text: "text-ink-2" },
  fail: { mark: "✕", box: "bg-critical text-white", text: "text-ink" },
};

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
        const glyph = GLYPH[state];

        return (
          <li
            key={rule.code}
            className={[
              "grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 rounded-ctrl border bg-canvas px-3 py-2.5",
              state === "fail" ? "border-critical/30" : "border-line",
            ].join(" ")}
          >
            <span
              className={`grid size-[18px] place-items-center rounded-full text-[11px] font-bold ${glyph.box}`}
              aria-hidden="true"
            >
              {glyph.mark}
            </span>
            <span className={`text-sm ${glyph.text}`}>{rule.message}</span>
            {detail[rule.code] && (
              <span
                className={`font-mono text-xs ${state === "fail" ? "font-medium text-critical" : "text-ink-3"}`}
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
