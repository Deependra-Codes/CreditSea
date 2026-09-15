import { Money } from "@/components/money";
import type { OverviewResponse } from "@lms/contracts";
import { rupeesToPaise } from "@lms/domain";
import { ActivityFeed } from "./activity-feed";
import { PortfolioChart } from "./portfolio-chart";

export function Overview({ data }: { data: OverviewResponse }) {
  const tiles = [
    { label: "Borrowers", value: String(data.borrowers) },
    { label: "Loans", value: String(data.totalLoans) },
    { label: "Lent", money: data.lent },
    { label: "Outstanding", money: data.outstanding },
    { label: "Collected", money: data.collected, note: `${data.paymentCount} payments` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="enter flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-sm text-ink-2">The whole book, across all four modules.</p>
      </div>

      <div
        className="enter grid grid-cols-2 gap-2.5 md:grid-cols-5"
        style={{ animationDelay: "60ms" }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-0.5 rounded-card bg-canvas px-3.5 py-3 ring-1 ring-line-soft"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {tile.label}
            </span>
            {tile.money === undefined ? (
              <span className="text-2xl font-extrabold tracking-tight tabular-nums">
                {tile.value}
              </span>
            ) : (
              <Money
                paise={rupeesToPaise(tile.money)}
                className="text-xl font-extrabold tracking-tight"
              />
            )}
            {tile.note && <span className="text-[11px] text-ink-3">{tile.note}</span>}
          </div>
        ))}
      </div>

      <div className="enter grid gap-4 lg:grid-cols-[1fr_1fr]" style={{ animationDelay: "120ms" }}>
        <PortfolioChart rows={data.byStatus} />
        <ActivityFeed events={data.activity} />
      </div>
    </div>
  );
}
