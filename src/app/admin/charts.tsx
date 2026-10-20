import type { ReactNode } from "react";
import type { Count, Daily } from "@/lib/admin-stats";

/*
 * Charts for the owner's statistics, rendered on the server. One series each, in the results
 * chart's colour (--chart-task, checked for contrast on the surface in both themes). Hovering or
 * focusing a column shows its value, and every chart has a table.
 */

const nb = new Intl.NumberFormat("nb-NO");
export const count = (n: number) => nb.format(n);
export const dollars = (n: number) => `$${n < 10 ? n.toFixed(2) : nb.format(Math.round(n))}`;

/** «21. okt.» for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** A round top for the y-axis: 1, 2, 5 or 10 times a power of ten. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= max) ?? 10 * p;
}

export function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold">{title}</h2>
        {aside && <span className="text-sm text-granite">{aside}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Missing() {
  return <p className="text-sm text-granite">Kunne ikke hentes akkurat nå.</p>;
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-5 ring-1 ring-ice">
      <p className="text-sm text-granite">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-sm text-granite">{detail}</p>}
    </div>
  );
}

/** The change from the week before, with an arrow and words so it doesn't rest on colour alone. */
export function Change({ now, before }: { now: number; before: number }) {
  if (now === before) return <span>samme som uka før</span>;
  const up = now > before;
  return (
    <span className={up ? "text-moss" : "text-rorbu"}>
      {up ? "▲" : "▼"} {count(Math.abs(now - before))} {up ? "flere" : "færre"} enn uka før
    </span>
  );
}

/** Columns for each of the last days, with the axis on round numbers. */
export function DailyColumns({ data, format = count }: { data: Daily; format?: (n: number) => string }) {
  const top = niceMax(Math.max(...data.map((d) => d.value)));
  const last = data.length - 1;
  return (
    <figure>
      <div className="relative h-40 pl-10">
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute right-0 left-10 border-t border-[var(--grid)]" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 -left-10 w-8 text-right text-xs text-granite tabular-nums">
              {format(top * f)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 left-10 flex items-end gap-[2px]">
          {data.map((d, i) => {
            const pct = (d.value / top) * 100;
            const side = i < 4 ? "left-0" : i > last - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <div
                key={d.day}
                tabIndex={0}
                aria-label={`${dayLabel(d.day)}: ${format(d.value)}`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-[var(--chart-task)] transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                  style={{ height: `${pct}%` }}
                />
                <div
                  className={`pointer-events-none absolute z-10 hidden rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-snow group-hover:block group-focus-visible:block ${side}`}
                  style={{ bottom: `calc(${pct}% + 6px)` }}
                >
                  <strong className="font-semibold">{format(d.value)}</strong>
                  <span className="ml-1.5 opacity-75">{dayLabel(d.day)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-10 text-xs text-granite">
        <span>{dayLabel(data[0].day)}</span>
        <span>{dayLabel(data[Math.floor(last / 2)].day)}</span>
        <span>{dayLabel(data[last].day)}</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-granite hover:text-ink">Vis som tabell</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <tbody>
            {data.toReversed().map((d) => (
              <tr key={d.day} className="border-t border-[var(--grid)]">
                <td className="py-1 text-granite">{dayLabel(d.day)}</td>
                <td className="py-1 text-right">{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars for a few categories, longest first unless the order means something. */
export function BarList({ items, label = (k) => k }: { items: Count; label?: (key: string) => string }) {
  if (items.length === 0) return <p className="text-sm text-granite">Ingen data ennå.</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={label(i.key)}>
            {label(i.key)}
          </span>
          <span className="h-3">
            <span
              className="block h-full rounded-r-[4px] bg-[var(--chart-task)]"
              style={{ width: `${Math.max((i.value / max) * 100, 2)}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{count(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}
