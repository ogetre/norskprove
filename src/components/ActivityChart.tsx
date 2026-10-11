"use client";

import { useEffect, useRef, useState } from "react";

export type DayCount = { date: string; label: string; count: number };

const H = 200;
const PAD = { top: 16, right: 8, bottom: 28, left: 28 };

/** Column chart of tasks per day; today is drawn in the accent colour. */
export function ActivityChart({ days }: { days: DayCount[] }) {
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

  const max = Math.max(4, ...days.map((d) => d.count));
  const top = Math.ceil(max / 2) * 2;
  const ticks = [0, top / 2, top];
  const innerW = Math.max(100, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / days.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => PAD.top + (1 - v / top) * innerH;
  const last = days.length - 1;

  const bar = (i: number, v: number) => {
    const x = PAD.left + band * i + (band - barW) / 2;
    const h = Math.max(0, y(0) - y(v));
    if (h === 0) return "";
    const r = Math.min(4, h, barW / 2);
    const top = y(v);
    return `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y(0)} Z`;
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="Oppgaver per dag de siste 14 dagene" className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--granite)">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={d.date}>
            <path d={bar(i, d.count)} fill={i === last ? "var(--rorbu)" : "var(--fjord)"} opacity={active === null || active === i ? 1 : 0.55} />
            {(i % 2 === last % 2 || days.length <= 7) && (
              <text x={PAD.left + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--granite)">
                {i === last ? "I dag" : d.label}
              </text>
            )}
            <rect
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              aria-label={`${d.label}: ${d.count} oppgaver`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none focus-visible:stroke-rorbu"
            />
          </g>
        ))}
      </svg>
      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 w-[112px] rounded-md bg-ink px-3 py-2 text-snow shadow-lg"
          style={{
            left: Math.min(Math.max(PAD.left + band * active + band / 2 - 56, 0), width - 112),
            top: Math.max(y(days[active].count) - 62, 0),
          }}
        >
          <span className="block font-semibold tabular-nums">
            {days[active].count} {days[active].count === 1 ? "oppgave" : "oppgaver"}
          </span>
          <span className="text-xs text-mist">{active === last ? "I dag" : days[active].label}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Oppgaver per dag</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.label}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
