"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, Search } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { EmptyState } from "./empty-state";

export type Column<T> = {
  key: string;
  header: string;
  align?: "right";
  /** Hidden below 640px, where only the columns that identify a row survive. */
  secondary?: boolean;
  render: (row: T) => ReactNode;
};

export type Tile = { label: string; value: string; unit?: string };

/**
 * What the four modules share is the shell: a header with a count, tiles, a
 * table, an empty state, and a row that opens in place. What they do not share
 * is the action panel, which each module passes in.
 *
 * The detail expands the row rather than opening a modal — a queue is worked one
 * row at a time, so keeping the list visible is better, and it needs no focus
 * trap, no scroll lock and no second layout for a phone.
 */
export function QueueShell<T>({
  title,
  subtitle,
  tiles,
  rows,
  columns,
  getRowId,
  searchText,
  empty,
  renderDetail,
}: {
  title: string;
  subtitle: string;
  tiles: Tile[];
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** What a search matches against. Omit it and the box is not shown. */
  searchText?: (row: T) => string;
  empty: { icon: LucideIcon; title: string; body: string };
  renderDetail?: (row: T) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible =
    searchText && needle
      ? rows.filter((row) => searchText(row).toLowerCase().includes(needle))
      : rows;

  return (
    <section className="flex flex-col gap-5">
      <div className="enter flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <span className="rounded-full bg-accent-sub px-2 py-0.5 text-xs font-bold text-accent">
            {needle ? `${visible.length} of ${rows.length}` : rows.length}
          </span>
        </div>
        <p className="text-sm text-ink-2">{subtitle}</p>
      </div>

      {tiles.length > 0 && (
        <div
          className="enter grid grid-cols-2 gap-2.5 sm:grid-cols-4"
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
              <span className="text-2xl font-extrabold tracking-tight">
                {tile.value}
                {tile.unit && (
                  <small className="ml-0.5 text-sm font-bold text-ink-3">{tile.unit}</small>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {searchText && rows.length > 0 && (
        <label className="enter relative flex items-center" style={{ animationDelay: "90ms" }}>
          <Search className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden />
          <span className="sr-only">Search this queue</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or PAN…"
            className="w-full rounded-ctrl bg-canvas py-2 pr-3 pl-9 text-sm ring-1 ring-line transition-shadow focus:ring-1 focus:ring-accent focus:outline-none sm:max-w-xs"
          />
        </label>
      )}

      {visible.length === 0 && needle ? (
        <p className="rounded-card bg-canvas px-5 py-10 text-center text-sm text-ink-3 ring-1 ring-line-soft">
          Nothing here matches &ldquo;{query}&rdquo;.
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />
      ) : (
        <div
          className="enter overflow-x-auto rounded-card bg-canvas ring-1 ring-line-soft"
          style={{ animationDelay: "120ms" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={[
                      "border-b border-line-soft px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap text-ink-3",
                      column.align === "right" ? "text-right" : "text-left",
                      column.secondary ? "hidden sm:table-cell" : "",
                    ].join(" ")}
                  >
                    {column.header}
                  </th>
                ))}
                {renderDetail && <th scope="col" className="border-b border-line-soft" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const id = getRowId(row);
                const open = openId === id;

                return (
                  <Fragment key={id}>
                    <tr className="transition-colors duration-150 hover:bg-accent-sub/40">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={[
                            "border-b border-line-soft px-3 py-2.5 whitespace-nowrap",
                            column.align === "right" ? "text-right" : "",
                            column.secondary ? "hidden sm:table-cell" : "",
                          ].join(" ")}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      {renderDetail && (
                        <td className="border-b border-line-soft px-3 py-2.5 text-right">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : id)}
                            className="inline-flex items-center gap-1 rounded-ctrl px-2 py-1 text-xs font-bold text-ink-2 ring-1 ring-line transition-colors hover:text-accent hover:ring-accent/40"
                          >
                            {open ? "Close" : "Open"}
                            <ChevronDown
                              className={`size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "rotate-180" : ""}`}
                              aria-hidden
                            />
                          </button>
                        </td>
                      )}
                    </tr>
                    {renderDetail && open && (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className="border-b border-line-soft bg-surface px-3 py-5"
                        >
                          <div className="enter">{renderDetail(row)}</div>
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
