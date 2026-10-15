"use client";

import Link from "next/link";
import { useState } from "react";
import { bandName, submissionFor, testResults } from "@/lib/progress-chart";
import { useAppState, useHydrated } from "@/lib/store";
import type { Level, WritingSubmission } from "@/lib/types";

type TaskInfo = { title: string; level: Level };
type Entry =
  | { kind: "text"; at: string; mode: string; sub: WritingSubmission }
  | { kind: "test"; at: string; subs: WritingSubmission[]; level: string | null };

const PAGE = 6;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }).replace(".", "")} kl. ${d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
}

export function savedTextHref(sub: WritingSubmission): string {
  return `/trening/skriving/oppgave/${sub.promptId}?tekst=${sub.id}`;
}

function TextLink({ sub, task, tag }: { sub: WritingSubmission; task?: TaskInfo; tag?: string }) {
  return (
    <Link
      href={savedTextHref(sub)}
      className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-ice transition-colors hover:bg-ice/50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ice text-xs font-medium text-fjord">
        {task?.level ?? "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{task?.title ?? "Oppgave som ikke finnes lenger"}</span>
        <span className="text-xs text-granite tabular-nums">
          {tag ? `${tag} · ` : ""}
          {sub.words} ord
        </span>
      </span>
      {sub.feedback ? (
        <span className="shrink-0 rounded-md bg-fjord/10 px-2 py-0.5 text-xs font-semibold text-fjord">
          AI: {sub.feedback.level_estimate}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-granite">Uten AI-vurdering</span>
      )}
    </Link>
  );
}

/** Texts the learner has handed in, newest first, with full tests kept together. */
export function WritingHistory({ tasks }: { tasks: Record<string, TaskInfo> }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const [shown, setShown] = useState(PAGE);
  if (!hydrated || state.writing.length === 0) return null;

  const inTests = new Set<string>();
  const tests: Entry[] = testResults(state, "skriving")
    .filter((t) => t.mode === "full")
    .map((t) => {
      const subs = t.parts.map((a) => submissionFor(state, a)).filter((s): s is WritingSubmission => s !== undefined);
      subs.forEach((s) => inTests.add(s.id));
      return { kind: "test", at: t.at, subs, level: subs.every((s) => s.feedback) ? bandName(t.value) : null };
    });
  const trials = new Set(
    state.attempts.filter((a) => a.skill === "skriving" && a.mode === "trial").map((a) => submissionFor(state, a)?.id),
  );
  const texts: Entry[] = state.writing
    .filter((w) => !inTests.has(w.id))
    .map((sub) => ({ kind: "text", at: sub.at, mode: trials.has(sub.id) ? "Prøvetest" : "Øving", sub }));
  const entries = [...tests, ...texts].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="mt-12" aria-labelledby="history-title">
      <h2 id="history-title" className="font-display text-2xl font-medium tracking-tight">
        Dine tekster
      </h2>
      <p className="mt-1 text-granite">Åpne en tekst du har levert for å se sjekken, AI-tilbakemeldingen og eksempelteksten igjen.</p>
      <ul className="mt-5 space-y-3">
        {entries.slice(0, shown).map((e) =>
          e.kind === "text" ? (
            <li key={e.sub.id}>
              <TextLink sub={e.sub} task={tasks[e.sub.promptId]} tag={`${e.mode}, ${dateLabel(e.at)}`} />
            </li>
          ) : (
            <li key={`test-${e.at}`} className="rounded-2xl bg-snow p-3 ring-1 ring-ice">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pb-2.5">
                <span className="font-semibold">
                  Full delprøve <span className="font-normal text-granite">· {dateLabel(e.at)}</span>
                </span>
                {e.level && (
                  <span className="rounded-md bg-ice px-2 py-0.5 text-sm font-semibold text-fjord">Nivå {e.level}</span>
                )}
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {e.subs.map((sub, i) => (
                  <li key={sub.id}>
                    <TextLink sub={sub} task={tasks[sub.promptId]} tag={`Oppgave ${i + 1}`} />
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
      {entries.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-4 rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink"
        >
          Vis flere ({entries.length - shown} igjen)
        </button>
      )}
    </section>
  );
}
