"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const STEP_MS = 2800;
/** Long enough that the fill is still travelling when the eye reaches it. */
const FILL_MS = 900;

const STAGES = [
  { label: "Applied", note: "with the sanction team", dot: "bg-stage-1", outstanding: null },
  { label: "Sanctioned", note: "approved, awaiting funds", dot: "bg-stage-2", outstanding: null },
  { label: "Disbursed", note: "funds released", dot: "bg-stage-3", outstanding: 1 },
  { label: "Closed", note: "repaid in full", dot: "bg-stage-4", outstanding: 0 },
] as const;

const LABELS = STAGES.map((stage) => stage.label);
const NOTES = STAGES.map((stage) => `90 days · 12% p.a. · ${stage.note}`);

/**
 * Every stage's words are always rendered and stacked, so only opacity changes.
 * Remounting the live one cut the old text dead before the new arrived, and
 * resized the box as the wording changed — two jumps in one.
 */
function StageText({ index, values }: { index: number; values: readonly string[] }) {
  return (
    <span className="grid">
      {values.map((value, position) => (
        <span
          key={value}
          // Transparent is still spoken, so the stack would read all four stages
          // out at once. Only the live one is exposed.
          aria-hidden={position !== index}
          className={`col-start-1 row-start-1 transition-opacity duration-500 ease-(--ease-standard) ${
            position === index ? "opacity-100" : "opacity-0"
          }`}
        >
          {value}
        </span>
      ))}
    </span>
  );
}

/**
 * The product demonstrating itself: one loan moving through its whole life on a
 * loop. Show, don't tell — a paragraph explaining the lifecycle is slower to
 * read and less convincing than watching a real card change state.
 */
export function LiveLoanCard() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((value) => (value + 1) % STAGES.length), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const stage = STAGES[index] ?? STAGES[0];
  const closed = index === STAGES.length - 1;

  return (
    <figure
      className="relative overflow-hidden rounded-card bg-canvas/80 p-6 ring-1 ring-line backdrop-blur-sm"
      aria-label="A loan moving from applied through to closed"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold">Ananya Iyer</span>
          <span className="font-mono text-[11px] text-ink-3">ABCPE1234F</span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-ink-2 ring-1 ring-line">
          <span
            className={`size-2 rounded-full transition-colors duration-500 ease-(--ease-standard) ${stage.dot}`}
          />
          <StageText index={index} values={LABELS} />
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <span className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">₹1,20,000</span>
        {/* Always present, so settling fades in rather than shoving the row. */}
        <span
          className={`flex items-center gap-1 text-xs font-bold text-good transition-opacity duration-500 ease-(--ease-standard) ${
            closed ? "opacity-100" : "opacity-0"
          }`}
        >
          <Check className="size-4 stroke-[3]" aria-hidden />
          Settled
        </span>
      </div>

      <p className="mt-1 text-xs text-ink-3">
        <StageText index={index} values={NOTES} />
      </p>

      {/* Outstanding appears when funds go out, and drains as it is repaid. */}
      <div
        className={`grid transition-all duration-700 ease-(--ease-standard) ${
          stage.outstanding === null
            ? "mt-0 grid-rows-[0fr] opacity-0"
            : "mt-5 grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
            <span>Outstanding</span>
            <span className="tabular-nums">{closed ? "₹0" : "₹1,23,551"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-interest transition-[width] duration-[1400ms] ease-(--ease-standard)"
              style={{ width: `${(stage.outstanding ?? 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Where it is on the rail. */}
      <ol className="mt-6 flex items-center" aria-hidden>
        {STAGES.map((entry, position) => (
          <li key={entry.label} className="contents">
            {position > 0 && (
              <span className="relative h-0.5 min-w-3 flex-auto overflow-hidden rounded-full bg-line">
                {/* Travels across rather than changing colour: a segment that
                    flips is a jump, one that fills is the loan moving. */}
                <span
                  className="absolute inset-0 origin-left rounded-full bg-stage-2 transition-transform ease-(--ease-standard)"
                  style={{
                    transform: `scaleX(${position <= index ? 1 : 0})`,
                    transitionDuration: `${FILL_MS}ms`,
                  }}
                />
              </span>
            )}
            {/* Lights once the fill has nearly arrived, so the rail reads as a
                journey instead of four things changing at the same instant. */}
            <span
              className={`size-2.5 rounded-full transition-all delay-[550ms] duration-500 ease-(--ease-standard) ${
                position <= index ? entry.dot : "bg-line"
              } ${position === index ? "ring-4 ring-accent-sub" : ""}`}
            />
          </li>
        ))}
      </ol>
    </figure>
  );
}
