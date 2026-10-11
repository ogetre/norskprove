"use client";

import { useEffect, useRef, useState } from "react";

export type ResultPoint = { label: string; detail: string; value: number };

const H = 210;
const PAD = { top: 14, right: 40, bottom: 26, left: 36 };
const TICKS = [0, 50, 100];

/** Line of percent correct per session, oldest to newest. */
export function ResultsChart({ points }: { points: ResultPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) {
    return (
      <div className="grid h-[210px] place-items-center rounded-xl bg-snow text-center">
        <div>
          <p className="font-medium">Ingen resultater ennå</p>
          <p className="mt-1 text-sm text-granite">Løs en øvelse, så tegner vi grafen din her.</p>
        </div>
      </div>
    );
  }

  const innerW = Math.max(100, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const n = points.length;
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v / 100) * innerH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const last = n - 1;

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * width - PAD.left;
    const i = n === 1 ? 0 : Math.round((rel / innerW) * (n - 1));
    setActive(Math.max(0, Math.min(last, i)));
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label={`Resultater fra ${n} økter. Siste: ${points[last].value} prosent riktig.`}
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
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--granite)">
              {t} %
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--granite)">
          {points[0].label}
        </text>
        {n > 1 && (
          <text x={PAD.left + innerW} y={H - 6} textAnchor="end" fontSize={11} fill="var(--granite)">
            {points[last].label}
          </text>
        )}
        {n > 1 && <path d={`${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--fjord)" fillOpacity={0.08} />}
        <path d={line} fill="none" stroke="var(--fjord)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(points[last].value)} r={6} fill="var(--surface)" />
        <circle cx={x(last)} cy={y(points[last].value)} r={4.5} fill="var(--fjord)" />
        <text x={x(last) + 10} y={y(points[last].value)} dy="0.32em" fontSize={13} fontWeight={600} fill="var(--ink)">
          {points[last].value}
        </text>
        {active !== null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--granite)" strokeOpacity={0.5} />
            <circle cx={x(active)} cy={y(points[active].value)} r={6} fill="var(--surface)" />
            <circle cx={x(active)} cy={y(points[active].value)} r={4.5} fill="var(--fjord)" />
          </g>
        )}
      </svg>
      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 w-[150px] rounded-md bg-ink px-3 py-2 text-snow shadow-lg"
          style={{
            left: Math.min(Math.max(x(active) - 75, 0), width - 150),
            top: Math.max(y(points[active].value) - 70, 0),
          }}
        >
          <span className="block font-semibold tabular-nums">{points[active].value} % riktig</span>
          <span className="block text-xs text-mist">{points[active].detail}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Resultater per økt</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.detail}</th>
              <td>{p.value} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
