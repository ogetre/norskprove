"use client";

import { useState } from "react";
import type { WritingTask } from "@/content/writing";
import type { Check } from "@/lib/writing-checks";
import { AiFeedback } from "./AiFeedback";

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="11" fill="rgb(76 118 82 / 0.15)" />
      <path d="M6.5 11.2l3 3 6-6.4" fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <circle cx="11" cy="11" r="11" fill="rgb(184 58 43 / 0.12)" />
      <path d="M11 6.5v6M11 15.5v.01" fill="none" stroke="var(--rorbu)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Rule-based checks, AI feedback, a self-check of the content points and the sample answer side by side. */
export function WritingFeedback({
  task,
  text,
  checks,
  submissionId,
  trial = false,
}: {
  task: WritingTask;
  text: string;
  checks: Check[];
  submissionId?: string;
  trial?: boolean;
}) {
  const [ticked, setTicked] = useState<boolean[]>(() => task.points.map(() => false));
  const [view, setView] = useState<"both" | "mine" | "model">("both");
  const passed = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-labelledby="checks-title">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="checks-title" className="text-xl font-semibold">
            Automatisk sjekk
          </h2>
          <span className="rounded-md bg-ice px-2.5 py-1 text-sm font-semibold text-fjord tabular-nums">
            {passed} av {checks.length} krav oppfylt
          </span>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-xl bg-snow p-4">
              <CheckIcon ok={c.ok} />
              <span>
                <span className="block font-semibold">{c.label}</span>
                <span className="text-sm leading-relaxed text-granite">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <AiFeedback task={task} text={text} submissionId={submissionId} trial={trial} />

      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-labelledby="points-title">
        <h2 id="points-title" className="text-xl font-semibold">
          Har du fått med alt?
        </h2>
        <p className="mt-1 text-sm text-granite">Les teksten din og kryss av for punktene du har skrevet om.</p>
        <ul className="mt-4 space-y-2">
          {task.points.map((p, i) => (
            <li key={p}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-snow">
                <input
                  type="checkbox"
                  checked={ticked[i]}
                  onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
                  className="size-5 accent-[var(--moss)]"
                />
                <span className={ticked[i] ? "text-granite line-through decoration-moss/60" : ""}>{p}</span>
              </label>
            </li>
          ))}
        </ul>
        {ticked.every(Boolean) && (
          <p className="rise mt-3 text-sm font-medium text-moss">Bra. Du har svart på hele oppgaven.</p>
        )}
      </section>

      <section aria-labelledby="compare-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="compare-title" className="text-xl font-semibold">
            Sammenlign med en eksempeltekst
          </h2>
          <div role="group" aria-label="Visning" className="flex rounded-lg bg-surface p-1 ring-1 ring-ice lg:hidden">
            {(["mine", "model"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v || (view === "both" && v === "mine")}
                onClick={() => setView(v)}
                className="rounded-md px-3 py-1.5 text-sm transition-colors aria-pressed:bg-ink aria-pressed:text-snow"
              >
                {v === "mine" ? "Din tekst" : "Eksempel"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className={`rounded-2xl bg-surface p-6 ring-1 ring-ice ${view === "model" ? "hidden lg:block" : ""}`}>
            <p className="text-sm font-semibold text-granite">Din tekst</p>
            <div className="mt-3 text-[16px] leading-relaxed whitespace-pre-wrap">{text || "Du leverte en tom tekst."}</div>
          </article>
          <article
            className={`rounded-2xl bg-fjord-deep p-6 text-snow ${view === "mine" || view === "both" ? "hidden lg:block" : ""}`}
          >
            <p className="text-sm font-semibold text-mist">Eksempel på en god tekst ({task.level})</p>
            <div className="mt-3 text-[16px] leading-relaxed whitespace-pre-wrap text-ice">{task.model}</div>
          </article>
        </div>
      </section>
    </div>
  );
}
