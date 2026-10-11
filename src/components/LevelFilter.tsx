"use client";

import { LEVELS, type Level } from "@/lib/types";

export type LevelChoice = Level | "alle";

export function levelCounts(items: { level: Level }[]): Record<LevelChoice, number> {
  const counts = { alle: items.length, A1: 0, A2: 0, B1: 0, B2: 0 };
  for (const i of items) counts[i.level]++;
  return counts;
}

/** Level pills with the number of items at each level; levels without items are disabled. */
export function LevelFilter({
  value,
  onChange,
  counts,
}: {
  value: LevelChoice;
  onChange: (level: LevelChoice) => void;
  counts: Record<LevelChoice, number>;
}) {
  return (
    <div role="group" aria-label="Velg nivå" className="flex flex-wrap gap-2">
      {(["alle", ...LEVELS] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={value === l}
          disabled={counts[l] === 0}
          onClick={() => onChange(l)}
          className="rounded-full border border-ice bg-surface px-3.5 py-1.5 text-sm transition-colors hover:border-mist disabled:opacity-35 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-snow"
        >
          {l === "alle" ? "Alle" : l}
          <span className="ml-1.5 text-xs tabular-nums opacity-60">{counts[l]}</span>
        </button>
      ))}
    </div>
  );
}
