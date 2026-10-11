"use client";

import { useEffect, useRef } from "react";
import type { WritingTask } from "@/content/writing";
import { WRITING_KIND_NAMES } from "@/content/writing";
import { countWords } from "@/lib/writing-checks";

const DRAFT_PREFIX = "norskproveklar:draft:";

export function loadDraft(key: string): string {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // ignore
  }
}

export function TaskCard({ task, compact = false }: { task: WritingTask; compact?: boolean }) {
  return (
    <div className={`rounded-xl border-l-4 border-rorbu bg-surface ring-1 ring-ice ${compact ? "p-5" : "p-6 sm:p-7"}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-ice px-2 py-0.5 font-display font-medium text-fjord">{task.level}</span>
        <span className="text-granite">{WRITING_KIND_NAMES[task.kind]}</span>
        <span className="rounded-md bg-snow px-2 py-0.5 text-granite tabular-nums">
          {task.minWords}–{task.maxWords} ord
        </span>
        <span className="rounded-md bg-snow px-2 py-0.5 text-granite tabular-nums">ca. {task.minutes} min</span>
      </div>
      <p className="mt-3 text-lg leading-relaxed font-medium">{task.task}</p>
      <p className="mt-4 text-sm font-semibold text-granite">Teksten skal ha med:</p>
      <ul className="mt-2 space-y-1.5">
        {task.points.map((p) => (
          <li key={p} className="flex gap-2.5 leading-snug">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rorbu" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WordMeter({ words, min, max }: { words: number; min: number; max: number }) {
  const top = max * 1.25;
  const pct = Math.min(100, (words / top) * 100);
  const state = words < min ? "short" : words > max ? "long" : "ok";
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={`min-w-16 font-semibold tabular-nums ${state === "ok" ? "text-moss" : state === "long" ? "text-warn" : "text-granite"}`}
      >
        {words} ord
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ice" aria-hidden="true">
        <span
          className="absolute inset-y-0 bg-moss/20"
          style={{ left: `${(min / top) * 100}%`, width: `${((max - min) / top) * 100}%` }}
        />
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${state === "ok" ? "bg-moss" : state === "long" ? "bg-[#d48c22]" : "bg-fjord"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-granite tabular-nums">
        {min}–{max}
      </span>
    </div>
  );
}

/** Plain textarea like on the exam: no spell check or autocorrect. Drafts are kept in the browser. */
export function WritingEditor({
  task,
  value,
  onChange,
  draftKey,
  autoFocus = false,
}: {
  task: WritingTask;
  value: string;
  onChange: (v: string) => void;
  draftKey: string;
  autoFocus?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div>
      <label htmlFor={`text-${draftKey}`} className="sr-only">
        Skriv teksten din her
      </label>
      <textarea
        id={`text-${draftKey}`}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            try {
              window.localStorage.setItem(DRAFT_PREFIX + draftKey, v);
            } catch {
              // ignore
            }
          }, 400);
        }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        placeholder="Skriv teksten din her …"
        className="block min-h-[340px] w-full resize-y rounded-xl border-2 border-ice bg-surface p-5 text-[17px] leading-relaxed shadow-[inset_0_1px_2px_rgb(15_43_60/0.04)] transition-colors placeholder:text-mist focus:border-fjord focus:outline-none sm:min-h-[420px]"
      />
      <div className="mt-3">
        <WordMeter words={countWords(value)} min={task.minWords} max={task.maxWords} />
      </div>
    </div>
  );
}
