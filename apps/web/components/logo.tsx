/**
 * The mark is the product's one idea: a single rail with four stops, climbing.
 * Each node takes its own step from the lifecycle ramp, so the logo and the
 * status colours are the same system rather than two that happen to match.
 *
 * At 20px it reads as a mark; larger, you can see it is a journey.
 */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" role="img">
      <title>Marg</title>
      <path
        d="M4 18.5 L20 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="4" cy="18.5" r="2.1" className="fill-stage-1" />
      <circle cx="9.33" cy="14.17" r="2.1" className="fill-stage-2" />
      <circle cx="14.67" cy="9.83" r="2.1" className="fill-stage-3" />
      <circle cx="20" cy="5.5" r="2.6" className="fill-stage-4" />
    </svg>
  );
}

/**
 * Marg — "path" in Hindi and Sanskrit. The whole system is one path a loan
 * walks, with a different team holding it at each stop, so the name is the
 * product rather than a label on it.
 */
export function Logo({
  className = "",
  markClassName = "size-6",
  showWord = true,
}: {
  className?: string;
  markClassName?: string;
  showWord?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-accent ${className}`}>
      <LogoMark className={markClassName} />
      {showWord && (
        <span className="text-base font-extrabold tracking-[-0.02em] text-ink">
          Marg
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">
            Lending
          </span>
        </span>
      )}
    </span>
  );
}
