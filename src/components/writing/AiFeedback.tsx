"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAccess } from "@/components/Access";
import type { WritingTask } from "@/content/writing";
import { locateErrors, type LocatedError } from "@/lib/error-spans";
import { FEEDBACK_LEVELS, topicName, type FeedbackLevel } from "@/lib/feedback-topics";
import { textLang } from "@/lib/languages";
import { useNativeLanguage } from "@/lib/native-language";
import { planHasAiFeedback } from "@/lib/plans";
import { attachWritingFeedback, useAppState } from "@/lib/store";
import type { WritingFeedback } from "@/lib/types";
import { countWords } from "@/lib/writing-checks";
import { FixYourself } from "./FixYourself";

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
// When each request started, so the progress bar keeps its place when the view remounts.
const startedAt = new Map<string, number>();

function requestFeedback(key: string, taskId: string, text: string, lang: string): Promise<WritingFeedback> {
  let request = requests.get(key);
  if (!request) {
    startedAt.set(key, Date.now());
    request = (async () => {
      let res: Response;
      try {
        res = await fetch("/api/writing-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, text, lang }),
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
  const [lang] = useNativeLanguage();
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
    requestFeedback(key, task.id, text, lang).then(
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
  }, [wanted, key, task.id, text, submissionId, round, lang]);

  const feedback = saved ?? (outcome && "feedback" in outcome ? outcome.feedback : undefined);
  if (feedback) return <FeedbackView task={task} text={text} feedback={feedback} submissionId={submissionId} />;
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
  if (loading) return <Skeleton />;
  return <Pending requestKey={key} words={countWords(text)} />;
}

function Skeleton() {
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-busy="true">
      {[92, 78, 85, 60].map((w) => (
        <div key={w} className="h-3.5 animate-pulse rounded bg-ice" style={{ width: `${w}%` }} />
      ))}
    </section>
  );
}

const STAGES: [from: number, label: string][] = [
  [0, "Leser teksten din"],
  [15, "Finner og retter feilene"],
  [55, "Vurderer nivået"],
  [75, "Skriver tilbakemeldingen"],
];

/**
 * Estimated progress: Claude reports none while it works, so the bar follows the time a
 * check usually takes (about 20–25 s, a little longer for long texts). It reaches 90 % at
 * the expected time and then creeps towards 99 % until the answer arrives.
 */
function progressAt(elapsedMs: number, expectedMs: number): number {
  if (elapsedMs <= expectedMs) return (90 * elapsedMs) / expectedMs;
  return 90 + 9 * (1 - Math.exp(-(elapsedMs - expectedMs) / 12_000));
}

function Pending({ requestKey, words }: { requestKey: string; words: number }) {
  const expectedMs = 18_000 + words * 40;
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - (startedAt.get(requestKey) ?? mountedAt);
  const percent = Math.floor(progressAt(elapsed, expectedMs));
  const stage = STAGES.findLast(([from]) => percent >= from)![1];
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
          AI-sensoren leser teksten din
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
        <div
          className="h-full rounded-full bg-fjord transition-[width] duration-300 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-granite">
        <span aria-live="polite">{stage} …</span>
        <span className="tabular-nums">{timeLeft}</span>
      </div>
      <p className="mt-4 text-sm text-granite">Du får feilene rettet og forklart, og en vurdering av nivået.</p>
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

function FeedbackView({
  task,
  text,
  feedback,
  submissionId,
}: {
  task: WritingTask;
  text: string;
  feedback: WritingFeedback;
  submissionId?: string;
}) {
  const errors = locateErrors(text, feedback.errors);
  const enoughForTask = rank(feedback.level_estimate) >= rank(task.level);
  const own = textLang(feedback.lang);
  const [fixing, setFixing] = useState(false);
  const revision = useAppState().writing.find((w) => w.id === submissionId)?.revision;
  const fixedCount = revision?.check.results.filter((r) => r.fixed).length ?? 0;

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
          <div className="flex-1">
            <p className={`font-semibold ${enoughForTask ? "text-moss" : "text-warn"}`}>
              {enoughForTask
                ? `Teksten holder nivået for oppgaven (${task.level}).`
                : `Teksten er under nivået for oppgaven (${task.level}).`}
            </p>
            <p {...own} className="mt-2 leading-relaxed">
              {feedback.summary}
            </p>
          </div>
        </div>
        <ul className="mt-6 divide-y divide-ice border-t border-ice">
          {feedback.criteria.map((c) => (
            <li key={c.name} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[13rem_3rem_1fr]">
              <span className="font-semibold">{c.name}</span>
              <span>
                <LevelChip level={c.level} />
              </span>
              <span {...own} className="text-sm leading-relaxed text-granite">
                {c.comment}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {fixing ? (
        <FixYourself
          task={task}
          text={text}
          errors={errors}
          submissionId={submissionId}
          explanationLang={feedback.lang}
          onClose={() => setFixing(false)}
        />
      ) : (
        <>
          {errors.length > 0 && (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-tint p-5 ring-1 ring-ice sm:p-6">
              <div className="max-w-xl">
                <h2 className="font-semibold">
                  {revision ? `Du har rettet ${fixedCount} av ${errors.length} feil selv` : "Prøv å rette feilene selv først"}
                </h2>
                <p className="mt-1 text-sm text-granite">
                  {revision
                    ? "Fortsett der du slapp, eller se løsningene under."
                    : "Du lærer mest av å finne løsningen selv. Rett teksten, så sjekker AI-sensoren rettingene dine."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFixing(true)}
                className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
              >
                {revision ? "Fortsett å rette" : "Rett feilene selv"}
              </button>
            </section>
          )}

          <ErrorsSection text={text} errors={errors} explanationLang={feedback.lang} />

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Dette gjør du bra" items={feedback.strengths} tone="moss" explanationLang={feedback.lang} />
            <ListCard title="Øv på dette" items={feedback.tips} tone="rorbu" explanationLang={feedback.lang} />
          </div>
        </>
      )}

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

function ErrorsSection({
  text,
  errors,
  explanationLang,
}: {
  text: string;
  errors: LocatedError[];
  explanationLang?: string;
}) {
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
              <p {...textLang(explanationLang)} className="mt-1.5 text-sm leading-relaxed text-granite">
                {e.explanation}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-granite">
        Feilene blir til øvelser du kan repetere.{" "}
        <Link href="/trening/feil" className="font-medium text-fjord underline-offset-4 hover:underline">
          Øv på feilene dine
        </Link>
      </p>
    </section>
  );
}

function ListCard({
  title,
  items,
  tone,
  explanationLang,
}: {
  title: string;
  items: string[];
  tone: "moss" | "rorbu";
  explanationLang?: string;
}) {
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
            <span {...textLang(explanationLang)}>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
