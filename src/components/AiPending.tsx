"use client";

import { useEffect, useState } from "react";

/**
 * Estimated progress: Claude reports none while it works, so the bar follows the time a
 * request usually takes. It reaches 90 % at the expected time and then creeps towards 99 %
 * until the answer arrives.
 */
function progressAt(elapsedMs: number, expectedMs: number): number {
  if (elapsedMs <= expectedMs) return (90 * elapsedMs) / expectedMs;
  return 90 + 9 * (1 - Math.exp(-(elapsedMs - expectedMs) / 12_000));
}

/** Progress bar while AI works; `startedAt` keeps its place when the view remounts. */
export function AiPending({
  startedAt,
  expectedMs,
  stages,
  title,
  note,
}: {
  startedAt?: number;
  expectedMs: number;
  stages: [from: number, label: string][];
  title: string;
  note: string;
}) {
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - (startedAt ?? mountedAt);
  const percent = Math.floor(progressAt(elapsed, expectedMs));
  const stage = stages.findLast(([from]) => percent >= from)![1];
  const secondsLeft = Math.ceil((expectedMs - elapsed) / 1000);
  const timeLeft =
    secondsLeft > 0
      ? `ca. ${secondsLeft} sek igjen`
      : elapsed < expectedMs + 15_000
        ? "Snart ferdig …"
        : "Det tar litt lengre tid enn vanlig …";

  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-busy="true" aria-labelledby="ai-pending-title">
      <div className="flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0 animate-spin">
          <circle cx="11" cy="11" r="9" fill="none" stroke="var(--ice)" strokeWidth="3" />
          <path d="M11 2a9 9 0 019 9" fill="none" stroke="var(--fjord)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h2 id="ai-pending-title" className="text-xl font-semibold">
          {title}
        </h2>
        <span className="ml-auto font-display text-2xl font-medium text-fjord tabular-nums">{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="ai-pending-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-ice"
      >
        <div className="h-full rounded-full bg-fjord transition-[width] duration-300 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-granite">
        <span aria-live="polite">{stage} …</span>
        <span className="tabular-nums">{timeLeft}</span>
      </div>
      <p className="mt-4 text-sm text-granite">{note}</p>
    </section>
  );
}
