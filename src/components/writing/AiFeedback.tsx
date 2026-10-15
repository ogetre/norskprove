"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAccess } from "@/components/Access";
import type { WritingTask } from "@/content/writing";
import { locateErrors, type LocatedError } from "@/lib/error-spans";
import { FEEDBACK_LEVELS, topicName, type FeedbackLevel } from "@/lib/feedback-topics";
import { planHasAiFeedback } from "@/lib/plans";
import { attachWritingFeedback, useAppState } from "@/lib/store";
import type { WritingFeedback } from "@/lib/types";
import { countWords } from "@/lib/writing-checks";

class RequestError extends Error {
  constructor(
    message: string,
    readonly canRetry: boolean,
  ) {
    super(message);
  }
}

// One request per handed-in text, shared by every view of it: the exam result tabs remount the feedback.
const requests = new Map<string, Promise<WritingFeedback>>();

function requestFeedback(key: string, taskId: string, text: string): Promise<WritingFeedback> {
  let request = requests.get(key);
  if (!request) {
    request = (async () => {
      let res: Response;
      try {
        res = await fetch("/api/writing-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, text }),
        });
      } catch {
        throw new RequestError("Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.", true);
      }
      const data = (await res.json().catch(() => null)) as { feedback?: WritingFeedback; error?: string } | null;
      if (res.ok && data?.feedback) return data.feedback;
      throw new RequestError(
        data?.error ?? "Noe gikk galt med AI-tilbakemeldingen. Prøv igjen.",
        res.status >= 500 || res.status === 422,
      );
    })();
    requests.set(key, request);
    request.catch(() => requests.delete(key));
  }
  return request;
}

type Outcome = { feedback: WritingFeedback } | { error: string; canRetry: boolean };

/** Language feedback from Claude on a handed-in text, for Premium. */
export function AiFeedback({
  task,
  text,
  submissionId,
  trial = false,
}: {
  task: WritingTask;
  text: string;
  submissionId?: string;
  trial?: boolean;
}) {
  const { plan, loading, dev } = useAccess();
  const saved = useAppState().writing.find((w) => submissionId && w.id === submissionId)?.feedback;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [round, setRound] = useState(0);

  const allowed = !trial && (dev || planHasAiFeedback(plan));
  const enough = countWords(text) >= 5;
  const wanted = !loading && allowed && enough && !saved;
  const key = submissionId ?? `${task.id}:${text}`;

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    requestFeedback(key, task.id, text).then(
      (feedback) => {
        if (submissionId) attachWritingFeedback(submissionId, feedback);
        if (!cancelled) setOutcome({ feedback });
      },
      (err: unknown) => {
        if (cancelled) return;
        setOutcome(
          err instanceof RequestError
            ? { error: err.message, canRetry: err.canRetry }
            : { error: "Noe gikk galt med AI-tilbakemeldingen. Prøv igjen.", canRetry: true },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [wanted, key, task.id, text, submissionId, round]);

  const feedback = saved ?? (outcome && "feedback" in outcome ? outcome.feedback : undefined);
  if (feedback) return <FeedbackView task={task} text={text} feedback={feedback} />;
  if (trial || (!loading && !allowed)) return <Upsell trial={trial} />;
  if (!enough) {
    return (
      <p className="rounded-lg bg-note px-4 py-3 text-sm leading-relaxed text-note-ink">
        Teksten er for kort til at AI-sensoren kan vurdere den.
      </p>
    );
  }
  if (outcome && "error" in outcome) {
    return (
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" role="alert">
        <h2 className="text-xl font-semibold">Tilbakemelding fra AI-sensoren</h2>
        <p className="mt-2 text-granite">{outcome.error}</p>
        {outcome.canRetry && (
          <button
            type="button"
            onClick={() => {
              setOutcome(null);
              setRound((r) => r + 1);
            }}
            className="mt-4 rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
          >
            Prøv igjen
          </button>
        )}
      </section>
    );
  }
  return <Pending checking={!loading} />;
}

function Pending({ checking }: { checking: boolean }) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-busy="true" aria-live="polite">
      {checking && (
        <>
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0 animate-spin">
              <circle cx="11" cy="11" r="9" fill="none" stroke="var(--ice)" strokeWidth="3" />
              <path d="M11 2a9 9 0 019 9" fill="none" stroke="var(--fjord)" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <h2 className="text-xl font-semibold">AI-sensoren leser teksten din …</h2>
          </div>
          <p className="mt-2 text-sm text-granite">
            Du får feilene rettet og forklart, og en vurdering av nivået. Det tar vanligvis under et halvt minutt.
          </p>
        </>
      )}
      <div className="mt-5 space-y-3" aria-hidden="true">
        {[92, 78, 85, 60].map((w) => (
          <div key={w} className="h-3.5 animate-pulse rounded bg-ice" style={{ width: `${w}%` }} />
        ))}
      </div>
    </section>
  );
}

function Upsell({ trial }: { trial: boolean }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-note p-6 text-note-ink sm:p-7">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold">
          {trial ? "Få tilbakemelding fra AI-sensoren" : "AI-tilbakemelding er med i Premium"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed">
          AI-sensoren finner feilene i teksten din, forklarer reglene og vurderer hvilket nivå teksten viser.
        </p>
      </div>
      <Link
        href="/priser"
        className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
      >
        {trial ? "Se abonnementene" : "Oppgrader til Premium"}
      </Link>
    </section>
  );
}

function rank(level: string): number {
  return FEEDBACK_LEVELS.indexOf(level as FeedbackLevel);
}

function LevelChip({ level }: { level: string }) {
  return (
    <span className="inline-flex rounded-md bg-ice px-2 py-0.5 text-sm font-semibold text-fjord tabular-nums">{level}</span>
  );
}

function FeedbackView({ task, text, feedback }: { task: WritingTask; text: string; feedback: WritingFeedback }) {
  const errors = locateErrors(text, feedback.errors);
  const enoughForTask = rank(feedback.level_estimate) >= rank(task.level);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-labelledby="ai-title">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="ai-title" className="text-xl font-semibold">
            Tilbakemelding fra AI-sensoren
          </h2>
          <span className="text-sm text-granite">Et estimat, ikke en offisiell vurdering</span>
        </div>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 items-center gap-4 sm:w-24 sm:flex-col sm:gap-2">
            <div className="grid size-20 place-items-center rounded-2xl bg-fjord-deep font-display text-3xl font-medium text-snow">
              {feedback.level_estimate}
            </div>
            <p className="text-sm text-granite sm:text-center">Nivået teksten viser</p>
          </div>
          <div>
            <p className={`font-semibold ${enoughForTask ? "text-moss" : "text-warn"}`}>
              {enoughForTask
                ? `Teksten holder nivået for oppgaven (${task.level}).`
                : `Teksten er under nivået for oppgaven (${task.level}).`}
            </p>
            <p className="mt-2 leading-relaxed">{feedback.summary}</p>
          </div>
        </div>
        <ul className="mt-6 divide-y divide-ice border-t border-ice">
          {feedback.criteria.map((c) => (
            <li key={c.name} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[13rem_3rem_1fr]">
              <span className="font-semibold">{c.name}</span>
              <span>
                <LevelChip level={c.level} />
              </span>
              <span className="text-sm leading-relaxed text-granite">{c.comment}</span>
            </li>
          ))}
        </ul>
      </section>

      <ErrorsSection text={text} errors={errors} />

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="Dette gjør du bra" items={feedback.strengths} tone="moss" />
        <ListCard title="Øv på dette" items={feedback.tips} tone="rorbu" />
      </div>

      <details className="group rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xl font-semibold">
          Teksten din, rettet og forbedret
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
            <path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="mt-4 text-[16px] leading-relaxed whitespace-pre-wrap">{feedback.improved_text}</div>
      </details>
    </div>
  );
}

function ErrorsSection({ text, errors }: { text: string; errors: LocatedError[] }) {
  if (errors.length === 0) {
    return (
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7">
        <h2 className="text-xl font-semibold">Feil og rettelser</h2>
        <p className="mt-2 font-medium text-moss">AI-sensoren fant ingen språkfeil i teksten. Bra jobbet!</p>
      </section>
    );
  }

  const topics = Object.entries(
    errors.reduce<Record<string, number>>((acc, e) => {
      const name = topicName(e.topic);
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const e of errors) {
    if (e.start < 0) continue;
    parts.push(text.slice(pos, e.start));
    parts.push(
      <a
        key={e.n}
        href={`#feil-${e.n}`}
        className="rounded-sm bg-rorbu/10 underline decoration-rorbu decoration-wavy underline-offset-4 transition-colors hover:bg-rorbu/20"
      >
        {text.slice(e.start, e.end)}
        <sup className="ml-0.5 inline-block text-[11px] font-semibold text-rorbu">{e.n}</sup>
      </a>,
    );
    pos = e.end;
  }
  parts.push(text.slice(pos));

  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-labelledby="errors-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="errors-title" className="text-xl font-semibold">
          Feil og rettelser
        </h2>
        <span className="rounded-md bg-rorbu/10 px-2.5 py-1 text-sm font-semibold text-rorbu tabular-nums">
          {errors.length} feil
        </span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Feil per tema">
        {topics.map(([name, n]) => (
          <li key={name} className="rounded-full bg-snow px-3 py-1 text-sm text-granite ring-1 ring-ice">
            {name} <span className="font-semibold text-ink tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl bg-snow p-5 text-[16px] leading-loose whitespace-pre-wrap">{parts}</div>
      <ol className="mt-5 space-y-3">
        {errors.map((e) => (
          <li
            key={e.n}
            id={`feil-${e.n}`}
            className="flex scroll-mt-24 gap-3 rounded-xl p-4 ring-1 ring-ice transition-shadow target:ring-2 target:ring-rorbu/60"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rorbu/10 text-sm font-semibold text-rorbu tabular-nums">
              {e.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[16px]">
                  <span className="text-rorbu line-through decoration-rorbu/50">{e.original}</span>
                  <span aria-hidden="true" className="mx-2 text-granite">
                    →
                  </span>
                  <span className="sr-only">skal være</span>
                  <span className="font-semibold text-moss">{e.correction}</span>
                </p>
                <span className="rounded-md bg-tint px-2 py-0.5 text-xs font-medium text-granite">{topicName(e.topic)}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-granite">{e.explanation}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "moss" | "rorbu" }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-relaxed">
            <span
              aria-hidden="true"
              className={`mt-2 size-2 shrink-0 rounded-full ${tone === "moss" ? "bg-moss" : "bg-rorbu"}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
