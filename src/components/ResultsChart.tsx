"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { bandName, bandStart, SCALE_BANDS, SCALE_TOP, type ChartPoint, type ChartSeries } from "@/lib/progress-chart";
import type { Level } from "@/lib/types";

export type { ChartPoint } from "@/lib/progress-chart";

const H = 280;
const PAD = { top: 10, right: 56, bottom: 26, left: 72 };
const TIP_W = 210;

const SERIES: Record<ChartSeries, { name: string; color: string }> = {
  prove: { name: "Delprøver og prøvetester", color: "var(--chart-test)" },
  oppgave: { name: "Oppgaver, snitt av de tre siste", color: "var(--chart-task)" },
};

function Swatch({ series }: { series: ChartSeries }) {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true" className="shrink-0">
      <line x1="1" x2="21" y1="5" y2="5" stroke={SERIES[series].color} strokeWidth="2.5" strokeLinecap="round" />
      {series === "prove" && <circle cx="11" cy="5" r="3.5" fill={SERIES[series].color} />}
    </svg>
  );
}

/**
 * Results on a level scale: the bands are the levels, so the lines show when a result
 * crosses into the next level. Tests and tasks are two lines on the same time order.
 */
export function ResultsChart({ points, level }: { points: ChartPoint[]; level?: Level }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  // Measured before paint, so the chart does not jump. A page hidden in the background
  // reports width 0; that is skipped so the chart is intact when the page comes back.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (w: number) => {
      if (w > 0) setWidth(Math.round(w));
    };
    measure(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => measure(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const legend = (
    <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-granite">
      {(["prove", "oppgave"] as const).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <Swatch series={s} />
          {SERIES[s].name}
        </li>
      ))}
    </ul>
  );

  if (points.length === 0) {
    return (
      <div ref={wrapRef} className="w-full min-w-0">
        {legend}
        <div className="grid h-[240px] place-items-center rounded-xl bg-snow text-center">
          <div>
            <p className="font-medium">Ingen resultater ennå</p>
            <p className="mt-1 text-sm text-granite">Løs en oppgave eller ta en delprøve, så tegner vi grafen din her.</p>
          </div>
        </div>
      </div>
    );
  }

  const innerW = Math.max(100, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const n = points.length;
  const last = n - 1;
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v / SCALE_TOP) * innerH;
  const current = level ? bandStart(level) : -1;

  const series = (["oppgave", "prove"] as const).map((s) => {
    const idx = points.flatMap((p, i) => (p.series === s ? [i] : []));
    const path = idx.map((i, k) => `${k ? "L" : "M"}${x(i)},${y(points[i].value)}`).join(" ");
    return { s, idx, path };
  });

  // Direct labels at the end of each line, moved apart when they would overlap.
  const ends = series
    .filter((l) => l.idx.length)
    .map((l) => ({ s: l.s, i: l.idx.at(-1)!, ly: y(points[l.idx.at(-1)!].value) }));
  if (ends.length === 2 && Math.abs(ends[0].ly - ends[1].ly) < 16) {
    const [hi, lo] = ends[0].ly < ends[1].ly ? [ends[0], ends[1]] : [ends[1], ends[0]];
    const mid = (hi.ly + lo.ly) / 2;
    hi.ly = mid - 8;
    lo.ly = mid + 8;
  }

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * width - PAD.left;
    const i = n === 1 ? 0 : Math.round((rel / innerW) * (n - 1));
    setActive(Math.max(0, Math.min(last, i)));
  };

  const latest = (s: ChartSeries) => [...points].reverse().find((p) => p.series === s);
  const summary = [
    latest("prove") && `siste delprøve ${bandName(latest("prove")!.value)}`,
    latest("oppgave") && `oppgavene ligger nå på ${bandName(latest("oppgave")!.value)}`,
  ]
    .filter(Boolean)
    .join(", ");
  const tip = active !== null ? points[active] : null;

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      {legend}
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label={`Resultatene dine på nivåskalaen fra under A1 til B2: ${summary}.`}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(last)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
          if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
        }}
        className="block touch-pan-y overflow-visible rounded-md"
      >
        {SCALE_BANDS.map((name, b) => (
          <g key={name}>
            <rect
              x={PAD.left}
              width={innerW}
              y={y(b + 1)}
              height={innerH / SCALE_TOP}
              fill={b === current ? "var(--fjord)" : "var(--grid)"}
              fillOpacity={b === current ? 0.1 : b % 2 ? 0.45 : 0}
            />
            <text
              x={PAD.left - 10}
              y={y(b + 0.5)}
              dy="0.32em"
              textAnchor="end"
              fontSize={12}
              fontWeight={b === current ? 700 : 500}
              fill={b === current ? "var(--ink)" : "var(--granite)"}
            >
              {name}
            </text>
          </g>
        ))}
        {/* The level thresholds a result crosses */}
        {SCALE_BANDS.slice(1).map((name, k) => (
          <line
            key={name}
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={y(k + 1)}
            y2={y(k + 1)}
            stroke="var(--mist)"
            strokeOpacity={0.7}
            strokeDasharray="4 4"
          />
        ))}
        <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--granite)">
          {points[0].date}
        </text>
        {n > 1 && (
          <text x={PAD.left + innerW} y={H - 6} textAnchor="end" fontSize={11} fill="var(--granite)">
            {points[last].date}
          </text>
        )}

        {series.map(({ s, path }) => (
          <path
            key={s}
            d={path}
            fill="none"
            stroke={SERIES[s].color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {series
          .find((l) => l.s === "prove")!
          .idx.map((i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(points[i].value)} r={6.5} fill="var(--surface)" />
              <circle cx={x(i)} cy={y(points[i].value)} r={4.5} fill={SERIES.prove.color} />
            </g>
          ))}
        {ends.map((e) => (
          <g key={e.s}>
            {e.s === "oppgave" && (
              <>
                <circle cx={x(e.i)} cy={y(points[e.i].value)} r={6} fill="var(--surface)" />
                <circle cx={x(e.i)} cy={y(points[e.i].value)} r={4} fill={SERIES.oppgave.color} />
              </>
            )}
            <text x={x(e.i) + 11} y={e.ly} dy="0.32em" fontSize={13} fontWeight={600} fill="var(--ink)">
              {bandName(points[e.i].value)}
            </text>
          </g>
        ))}

        {tip && active !== null && (
          <g pointerEvents="none">
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--granite)"
              strokeOpacity={0.5}
            />
            <circle cx={x(active)} cy={y(tip.value)} r={7} fill="var(--surface)" />
            <circle cx={x(active)} cy={y(tip.value)} r={5} fill={SERIES[tip.series].color} />
          </g>
        )}
      </svg>

      {tip && active !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-ink px-3 py-2 text-snow shadow-lg"
          style={{
            width: TIP_W,
            left: Math.min(Math.max(x(active) - TIP_W / 2, 0), width - TIP_W),
            top: Math.max(y(tip.value) - 64, 0),
          }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: SERIES[tip.series].color }} />
            {tip.title} · {tip.date}
          </span>
          <span className="mt-0.5 block text-xs text-mist">{tip.detail}</span>
          {tip.series === "oppgave" && (
            <span className="block text-xs text-mist">Snitt av de tre siste: {bandName(tip.value)}</span>
          )}
        </div>
      )}

      {/* sr-only on a wrapper: a table ignores the 1px width and would widen the page */}
      <div className="sr-only">
        <table>
          <caption>Resultatene dine, eldste først</caption>
          <thead>
            <tr>
              <th scope="col">Dato</th>
              <th scope="col">Hva</th>
              <th scope="col">Resultat</th>
              <th scope="col">Nivå</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{p.title}</td>
                <td>{p.detail}</td>
                <td>{bandName(p.own)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
