"use client";

import { Fragment, type ReactNode, useState } from "react";

export type Column<T> = {
  key: string;
  header: string;
  align?: "right";
  /** Hidden below 640px, where only the columns that identify a row survive. */
  secondary?: boolean;
  render: (row: T) => ReactNode;
};

export type Tile = { label: string; value: string };

/**
 * What the four modules share is the shell: a header with a count, tiles, a
 * table, empty state, and a row that opens in place. What they do not share is
 * the action panel, which each module passes in.
 *
 * The detail expands the row rather than opening a modal — a queue is worked
 * one row at a time, so keeping the list visible is better, and it needs no
 * focus trap, no scroll lock and no second layout for a phone.
 */
export function QueueShell<T>({
  title,
  subtitle,
  tiles,
  rows,
  columns,
  getRowId,
  emptyMessage,
  renderDetail,
}: {
  title: string;
  subtitle: string;
  tiles: Tile[];
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  emptyMessage: string;
  renderDetail?: (row: T) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
            {rows.length}
          </span>
        </div>
        <p className="text-sm text-ink-2">{subtitle}</p>
      </div>

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col gap-0.5 rounded-card border border-line bg-canvas px-3.5 py-3"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {tile.label}
              </span>
              <span className="text-xl font-bold tabular-nums tracking-tight">{tile.value}</span>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 bg-canvas px-5 py-10 text-center text-sm text-ink-3">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-canvas">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={[
                      "border-b border-line bg-surface px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-ink-3",
                      column.align === "right" ? "text-right" : "text-left",
                      column.secondary ? "hidden sm:table-cell" : "",
                    ].join(" ")}
                  >
                    {column.header}
                  </th>
                ))}
                {renderDetail && <th scope="col" className="border-b border-line bg-surface" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = getRowId(row);
                const open = openId === id;

                return (
                  <Fragment key={id}>
                    <tr className="transition-colors hover:bg-surface">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={[
                            "border-b border-line px-3 py-2.5 whitespace-nowrap",
                            column.align === "right" ? "text-right font-mono tabular-nums" : "",
                            column.secondary ? "hidden sm:table-cell" : "",
                          ].join(" ")}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      {renderDetail && (
                        <td className="border-b border-line px-3 py-2.5 text-right">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : id)}
                            className="rounded-ctrl border border-line-2 px-2.5 py-1 text-xs font-semibold text-ink-2 hover:text-ink"
                          >
                            {open ? "Close" : "Open"}
                          </button>
                        </td>
                      )}
                    </tr>
                    {renderDetail && open && (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className="border-b border-line bg-surface px-3 py-4"
                        >
                          {renderDetail(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
