import type { CSSProperties } from "react";
import { Reveal } from "./Reveal";

// One mountain per level; summits sit at the centre of each quarter so the
// HTML labels below line up with a plain 4-column grid.
const peaks = [
  {
    level: "A1",
    text: "Enkle setninger om deg selv",
    fill: "var(--peak-1)",
    body: "-30,320 60,272 95,262 125,230 160,255 205,270 300,320",
    snow: "125,230 112,244 119,242 125,249 132,241 140,246",
  },
  {
    level: "A2",
    text: "Butikken, legen og naboene",
    fill: "var(--peak-2)",
    body: "180,320 270,238 310,222 345,188 375,160 410,190 450,205 520,262 570,320",
    snow: "375,160 355,180 366,177 374,188 384,177 396,183",
  },
  {
    level: "B1",
    text: "B1 muntlig kreves for statsborgerskap",
    fill: "var(--peak-3)",
    body: "430,320 500,230 540,200 580,130 625,80 665,128 700,150 760,230 820,320",
    snow: "625,80 600,110 612,106 620,120 632,107 645,116 652,108",
    goal: true,
  },
  {
    level: "B2",
    text: "Jobb og studier på norsk",
    fill: "var(--peak-4)",
    body: "690,320 760,210 800,160 840,70 875,14 905,60 930,95 980,170 1030,320",
    snow: "875,14 848,58 861,53 869,68 880,55 893,70 902,56",
  },
];

export function LevelRidge() {
  return (
    <Reveal className="mt-16">
      <div className="relative h-[220px] sm:h-[320px]">
        <svg
          viewBox="0 0 1000 320"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {peaks.map((p, i) => (
            <g key={p.level} className="r-grow" style={{ "--d": `${150 + i * 220}ms` } as CSSProperties}>
              <polygon points={p.body} fill={p.fill} />
              <polygon points={p.snow} fill="var(--land-snow)" />
            </g>
          ))}
        </svg>

        {/* Goal flag planted on the B1 summit (x 62.5%, y 25%) */}
        <div
          className="r-pop absolute left-[62.5%] top-[25%] -translate-y-full"
          style={{ "--d": "1250ms", transformOrigin: "left bottom" } as CSSProperties}
        >
          <div className="relative h-11 w-0.5 bg-ink sm:h-14">
            <span className="absolute top-0 left-0.5 rounded-r-md bg-rorbu py-1 pr-2.5 pl-2 text-[11px] font-semibold text-white shadow-md sm:text-xs">
              Mål
            </span>
          </div>
        </div>

        <ol className="absolute inset-x-0 bottom-3 grid grid-cols-4 text-center">
          {peaks.map((p, i) => (
            <li
              key={p.level}
              className="r-fade font-display text-lg font-medium text-white sm:text-3xl"
              style={{ "--d": `${450 + i * 220}ms` } as CSSProperties}
            >
              {p.level}
            </li>
          ))}
        </ol>
      </div>

      <ul className="mt-5 grid grid-cols-4 gap-2 text-center sm:gap-5">
        {peaks.map((p, i) => (
          <li
            key={p.level}
            className={`r-fade text-xs leading-snug sm:text-sm ${p.goal ? "font-medium text-rorbu" : "text-granite"}`}
            style={{ "--d": `${550 + i * 220}ms` } as CSSProperties}
          >
            {p.text}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
