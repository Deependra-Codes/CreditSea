"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const STEP_MS = 2600;

const STAGES = [
  { label: "Applied", note: "with the sanction team", dot: "bg-stage-1", outstanding: null },
  { label: "Sanctioned", note: "approved, awaiting funds", dot: "bg-stage-2", outstanding: null },
  { label: "Disbursed", note: "funds released", dot: "bg-stage-3", outstanding: 1 },
  { label: "Closed", note: "repaid in full", dot: "bg-stage-4", outstanding: 0 },
] as const;

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

        <span
          key={stage.label}
          className="enter inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-ink-2 ring-1 ring-line"
        >
          <span className={`size-2 rounded-full transition-colors duration-500 ${stage.dot}`} />
          {stage.label}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <span className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">₹1,20,000</span>
        {closed && (
          <span className="enter flex items-center gap-1 text-xs font-bold text-good">
            <Check className="size-4 stroke-[3]" aria-hidden />
            Settled
          </span>
        )}
      </div>

      <p key={stage.note} className="enter mt-1 text-xs text-ink-3">
        90 days · 12% p.a. · {stage.note}
      </p>

      {/* Outstanding appears when funds go out, and drains as it is repaid. */}
      <div
        className={`grid transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
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
              className="h-full rounded-full bg-interest transition-[width] duration-[1400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
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
              <span
                className={`h-0.5 min-w-3 flex-auto transition-colors duration-500 ${
                  position <= index ? "bg-stage-2" : "bg-line"
                }`}
              />
            )}
            <span
              className={`size-2.5 rounded-full transition-all duration-500 ${
                position <= index ? entry.dot : "bg-line"
              } ${position === index ? "ring-4 ring-accent-sub" : ""}`}
            />
          </li>
        ))}
      </ol>
    </figure>
  );
}
