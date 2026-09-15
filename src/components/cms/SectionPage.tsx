import type { ReactNode } from "react";
import { Panel, PageTitle, Shell, Stat, StatusPill } from "./Shell";

export type SectionRow = {
  id: string;
  primary: string;
  secondary: string;
  cells: string[];
  status: string;
  owner: string;
};

export type SectionStat = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  bar?: number;
  emphasis?: boolean;
};

export function SectionPage({
  kicker,
  title,
  breadcrumb,
  tableTitle,
  columns,
  rows,
  stats,
  filters,
  panelMeta,
  footer,
}: {
  kicker: string;
  title: string;
  breadcrumb: string;
  tableTitle: string;
  columns: string[];
  rows: SectionRow[];
  stats: SectionStat[];
  /** Optional filter-bar slot rendered above the table panel (search inputs, category pills, etc). */
  filters?: ReactNode;
  /** Optional override for the panel header meta text (defaults to "<n> ACTIVE RECORDS"). */
  panelMeta?: string;
  /** Optional content rendered below the table (e.g. pagination controls). */
  footer?: ReactNode;
}) {
  return (
    <Shell breadcrumb={breadcrumb}>
      <PageTitle kicker={kicker} title={title} />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      {filters ? (
        <div className="rise mb-6" style={{ animationDelay: "200ms" }}>
          {filters}
        </div>
      ) : null}

      <Panel title={tableTitle} meta={panelMeta ?? `${rows.length} ACTIVE RECORDS`} delay={250}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-raise/10 text-left font-mono text-[10px] tracking-[0.2em] text-dim/70 uppercase">
                <th className="px-6 py-4 font-bold">{columns[0]}</th>
                {columns.slice(1).map((c) => (
                  <th key={c} className="px-4 py-4 font-bold">
                    {c}
                  </th>
                ))}
                <th className="px-6 py-4 text-right font-bold">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="group transition-all hover:bg-raise">
                  <td className="px-6 py-5">
                    <div className="text-[14px] font-bold transition-colors group-hover:text-accent">
                      {row.primary}
                    </div>
                    <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                      {row.secondary}
                    </div>
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-4 py-5 font-mono text-[11px] text-mute">
                      {cell}
                    </td>
                  ))}
                  <td className="px-4 py-5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-mute">{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer ? (
          <div className="flex items-center justify-between border-t border-line bg-raise/10 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </Panel>
    </Shell>
  );
}
