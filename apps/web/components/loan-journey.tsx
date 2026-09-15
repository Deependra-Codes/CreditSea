const STOPS = [
  { label: "Applied", dot: "bg-stage-1" },
  { label: "Sanctioned", dot: "bg-stage-2" },
  { label: "Disbursed", dot: "bg-stage-3" },
  { label: "Closed", dot: "bg-stage-4" },
] as const;

// Matches the travel keyframes: the token reaches each stop at 8%, 28%, 52%, 76%
// of an 8s loop, so each stop pulses as it arrives.
const ARRIVAL_DELAY_MS = [640, 2240, 4160, 6080] as const;

/**
 * The product's own lifecycle, running on a loop. It fills the panel with the
 * thing the system actually does rather than with decoration, and it is the one
 * place on the page that moves.
 */
export function LoanJourney() {
  return (
    <figure
      className="relative flex flex-col gap-6 rounded-card bg-surface/60 px-6 py-7 ring-1 ring-line-soft"
      aria-label="A loan moving from applied through to closed"
    >
      <figcaption className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
        Every loan takes this path
      </figcaption>

      <div className="relative">
        {/* the track, and the portion already travelled */}
        <div className="absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-line" aria-hidden />
        <div
          aria-hidden
          className="absolute inset-x-0 top-1.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-stage-1 via-stage-2 to-stage-4"
          style={{ animation: "fill-track 8s var(--ease-standard) infinite" }}
        />

        {/* the loan itself */}
        <span
          aria-hidden
          className="journey-token absolute top-0 size-3.5 -translate-x-1/2 rounded-full bg-accent ring-4 ring-accent/25"
        />

        <ol className="relative flex justify-between">
          {STOPS.map((stop, index) => (
            <li key={stop.label} className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className={`size-3.5 rounded-full ${stop.dot}`}
                style={{
                  animation: "arrive 8s var(--ease-standard) infinite",
                  animationDelay: `${ARRIVAL_DELAY_MS[index]}ms`,
                }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-2">
                {stop.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-xs text-ink-3">
        One rail, four owners. A borrower watches it from the portal; each executive works the stop
        that is theirs.
      </p>
    </figure>
  );
}
