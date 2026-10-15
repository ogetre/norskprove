"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WritingTask } from "@/content/writing";
import { addWriting, recordAttempt, useHydrated } from "@/lib/store";
import type { Mode } from "@/lib/types";
import { checkWriting, countWords, type Check } from "@/lib/writing-checks";
import { clearDraft, loadDraft, TaskCard, WritingEditor } from "./WritingEditor";
import { WritingFeedback } from "./WritingFeedback";

export function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Practice({
  task,
  mode,
  timed,
  after,
}: {
  task: WritingTask;
  mode: Mode;
  timed: boolean;
  after?: ReactNode;
}) {
  const draftKey = `${mode}-${task.id}`;
  const [text, setText] = useState(() => loadDraft(draftKey));
  const [result, setResult] = useState<{ id: string; text: string; checks: Check[] } | null>(null);
  const [deadline] = useState(() => Date.now() + task.minutes * 60_000);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);

  const submit = (final = text) => {
    if (submitted.current) return;
    submitted.current = true;
    const checks = checkWriting(task, final);
    const passed = checks.filter((c) => c.ok).length;
    recordAttempt({ skill: "skriving", taskId: task.id, level: task.level, correct: passed, total: checks.length, mode });
    const id = addWriting({ promptId: task.id, text: final, words: countWords(final) });
    clearDraft(draftKey);
    setResult({ id, text: final, checks });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!timed || result) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timed, result]);

  const remaining = deadline - now;
  useEffect(() => {
    if (timed && !result && remaining <= 0) submit();
    // submit reads the latest text; only the clock should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (result) {
    const passed = result.checks.filter((c) => c.ok).length;
    return (
      <div className="space-y-6">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">Levert: {task.title}</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {passed} av {result.checks.length} krav
            </p>
            <p className="mt-2 text-ice">
              {countWords(result.text)} ord. +{10 + passed * 5} poeng
            </p>
          </div>
        </div>
        {after}
        <WritingFeedback
          task={task}
          text={result.text}
          checks={result.checks}
          submissionId={result.id}
          trial={mode === "trial"}
        />
      </div>
    );
  }

  const words = countWords(text);
  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <TaskCard task={task} />
        {timed && (
          <p
            role="timer"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold tabular-nums ${remaining < 5 * 60_000 ? "bg-rorbu/10 text-rorbu" : "bg-surface text-ink ring-1 ring-ice"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 6v3l2 1.5M6.5 1.5h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {clock(remaining)}
          </p>
        )}
      </div>
      <div>
        <WritingEditor task={task} value={text} onChange={setText} draftKey={draftKey} autoFocus />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={words < 5}
            onClick={() => submit()}
            className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-[background-color,opacity] hover:bg-[#a03022] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Lever teksten
          </button>
          <span className="text-sm text-granite">Utkastet lagres automatisk.</span>
        </div>
      </div>
    </div>
  );
}

/** One writing prompt: write, hand in, see checks and a sample answer. */
export function WritingPractice(props: { task: WritingTask; mode: Mode; timed?: boolean; after?: ReactNode }) {
  const hydrated = useHydrated();
  // Drafts live in localStorage, so the editor mounts after hydration.
  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;
  return <Practice key={props.task.id} {...props} timed={props.timed ?? false} />;
}
