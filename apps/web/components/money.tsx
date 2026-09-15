import { type Paise, formatPaise } from "@lms/domain";

export function Money({ paise, className = "" }: { paise: number; className?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>{formatPaise(paise as Paise)}</span>
  );
}
