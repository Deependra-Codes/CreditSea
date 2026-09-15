import { Money } from "@/components/money";

/**
 * Part-to-whole at true proportion: at thirty days the interest is a sliver you
 * have to look for, and at a year it is a block. Both segments are direct
 * labelled, so identity never rests on colour.
 */
export function RepaymentBar({
  principalPaise,
  interestPaise,
}: {
  principalPaise: number;
  interestPaise: number;
}) {
  const total = principalPaise + interestPaise;
  const interestShare = (interestPaise / total) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-9 gap-0.5"
        role="img"
        aria-label={`Repayment split: principal ₹${Math.round(principalPaise / 100)}, interest ₹${Math.round(interestPaise / 100)}`}
      >
        <span
          className="h-full rounded-l bg-accent transition-[flex-basis] duration-200"
          style={{ flex: `0 0 ${100 - interestShare}%` }}
        />
        <span
          className="h-full min-w-1 rounded-r bg-interest transition-[flex-basis] duration-200"
          style={{ flex: `0 0 ${interestShare}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-sm bg-accent" />
          Principal <Money paise={principalPaise} className="font-medium text-ink" />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-sm bg-interest" />
          Interest <Money paise={interestPaise} className="font-medium text-ink" />
        </span>
      </div>
    </div>
  );
}
