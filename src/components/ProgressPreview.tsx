"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

// Illustrative data for the landing page preview.
const scores = [38, 44, 47, 53, 58, 61, 67, 72];
const B1_LINE = 65;

const skills = [
  { name: "Lesing", level: "B1", value: 0.74 },
  { name: "Lytting", level: "A2", value: 0.56 },
  { name: "Skriving", level: "B1", value: 0.68 },
  { name: "Muntlig", level: "A2", value: 0.5 },
];

const H = 220;
const PAD = { top: 16, right: 44, bottom: 30, left: 34 };
const TICKS = [0, 25, 50, 75, 100];

function ScoreChart() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(120, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (scores.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - v / 100) * innerH;

  const line = scores.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(scores.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = scores.length - 1;

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * width - PAD.left;
    const i = Math.round((rel / innerW) * (scores.length - 1));
    setActive(Math.max(0, Math.min(last, i)));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last + 1) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label="Poeng på prøveeksamen steg fra 38 i uke 1 til 72 i uke 8."
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? last)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
        className="block touch-pan-y overflow-visible rounded-md"
      >
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--granite)">
              {t}
            </text>
          </g>
        ))}
        {scores.map((_, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--granite)">
            {i === 0 ? "Uke 1" : i + 1}
          </text>
        ))}

        {/* B1 reference line */}
        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={y(B1_LINE)}
          y2={y(B1_LINE)}
          stroke="var(--rorbu)"
          strokeOpacity={0.55}
          strokeWidth={1}
        />
        <text x={PAD.left + 6} y={y(B1_LINE) - 6} fontSize={11} fill="var(--ink)">
          B1
        </text>

        <path d={area} fill="var(--fjord)" fillOpacity={0.1} className="r-fade" style={{ "--d": "700ms" } as CSSProperties} />
        <path
          d={line}
          pathLength={1}
          fill="none"
          stroke="var(--fjord)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="r-draw"
          style={{ "--d": "150ms" } as CSSProperties}
        />

        <g className="r-pop" style={{ "--d": "1300ms" } as CSSProperties}>
          <circle cx={x(last)} cy={y(scores[last])} r={6} fill="var(--surface)" />
          <circle cx={x(last)} cy={y(scores[last])} r={4.5} fill="var(--fjord)" />
        </g>
        <text
          x={x(last) + 10}
          y={y(scores[last])}
          dy="0.32em"
          fontSize={13}
          fontWeight={600}
          fill="var(--ink)"
          className="r-fade"
          style={{ "--d": "1400ms" } as CSSProperties}
        >
          {scores[last]}
        </text>

        {active !== null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--granite)" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={x(active)} cy={y(scores[active])} r={6} fill="var(--surface)" />
            <circle cx={x(active)} cy={y(scores[active])} r={4.5} fill="var(--fjord)" />
          </g>
        )}
      </svg>

      {active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-md bg-ink px-3 py-2 text-snow shadow-lg"
          style={{
            left: Math.min(Math.max(x(active) - 60, 0), width - 120),
            top: Math.max(y(scores[active]) - 64, 0),
            width: 120,
          }}
        >
          <span className="block text-base font-semibold tabular-nums">{scores[active]} poeng</span>
          <span className="flex items-center gap-1.5 text-xs text-mist">
            <span className="inline-block h-0.5 w-3 rounded bg-ice" aria-hidden="true" />
            Uke {active + 1}
          </span>
        </div>
      )}

      <table className="sr-only">
        <caption>Poeng på prøveeksamen per uke</caption>
        <thead>
          <tr>
            <th scope="col">Uke</th>
            <th scope="col">Poeng</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const stats = [
  { label: "Dager på rad", value: 12, note: "Rekord: 15" },
  { label: "Ord lært", value: 248, note: "+31 denne uken" },
  { label: "Oppgaver løst", value: 86, note: "+14 denne uken" },
];

export function ProgressPreview() {
  return (
    <Reveal className="relative">
      <div className="r-up rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgb(15_43_60/0.06),0_40px_80px_-40px_rgb(15_43_60/0.5)] ring-1 ring-ice sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-tile font-display text-lg text-white">
              O
            </span>
            <div>
              <p className="font-semibold">Olena</p>
              <p className="text-sm text-granite">Mål: B1 muntlig</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-medium tabular-nums">
              <CountUp value={34} /> <span className="text-base text-granite">dager</span>
            </p>
            <p className="text-sm text-granite">til prøven 14. november</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="r-up rounded-xl bg-snow p-3 sm:p-4"
              style={{ "--i": i + 1 } as CSSProperties}
            >
              <dt className="text-xs text-granite sm:text-sm">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold sm:text-3xl">
                <CountUp value={s.value} />
              </dd>
              <dd className="mt-0.5 text-xs text-moss">{s.note}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7">
          <p className="font-semibold">Poeng på prøveeksamen</p>
          <p className="text-sm text-granite">Siste 8 uker. Hold over linjen for å se hver uke.</p>
          <div className="mt-3">
            <ScoreChart />
          </div>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
          {skills.map((s, i) => (
            <li key={s.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="font-semibold">{s.level}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ice">
                <div
                  className="r-bar h-full rounded-full bg-fjord"
                  style={{ width: `${s.value * 100}%`, "--i": i, "--d": "600ms" } as CSSProperties}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
