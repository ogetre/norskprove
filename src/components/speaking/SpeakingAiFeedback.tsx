"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiPending } from "@/components/AiPending";
import type { SpeakingTask } from "@/content/speaking";
import { topicName } from "@/lib/feedback-topics";
import { textLang } from "@/lib/languages";
import { useNativeLanguage } from "@/lib/native-language";
import { gradeTask, type Graded } from "@/lib/oral-check-client";
import type { Answer } from "@/lib/speaking-checks";
import { attachSpeakingFeedback, useAppState } from "@/lib/store";
import { speak, stopSpeaking, useNorwegianVoices } from "@/lib/tts";
import type { SpeakingFeedback } from "@/lib/types";

const STAGES: [from: number, label: string][] = [
  [0, "Hører på opptakene dine"],
  [15, "Skriver ned det du sa"],
  [40, "Finner det som kan sies bedre"],
  [65, "Vurderer nivået og uttalen"],
  [85, "Skriver tilbakemeldingen"],
];

const RATE = { A1: 0.85, A2: 0.9, B1: 0.95, B2: 1 } as const;

/**
 * The AI examiner's assessment of the answers to one task. With a check (api/oral-check) Gemini
 * hears the recordings; without one the learner is shown how to get it. Saved with the answers.
 */
export function SpeakingAiFeedback({
  task,
  answers,
  checkId,
  submissionId,
  onGraded,
}: {
  task: SpeakingTask;
  answers: Answer[];
  checkId: string | null;
  submissionId?: string;
  onGraded?: (graded: Graded) => void;
}) {
  const [lang] = useNativeLanguage();
  const saved = useAppState().speaking.find((s) => submissionId && s.id === submissionId)?.feedback;
  const [result, setResult] = useState<SpeakingFeedback | { error: string } | null>(null);
  const [round, setRound] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const wanted = Boolean(checkId) && !saved && answers.length > 0;

  useEffect(() => {
    if (!wanted || !checkId) return;
    let cancelled = false;
    gradeTask(checkId, task.id, answers, lang).then(
      (graded) => {
        if (submissionId) attachSpeakingFeedback(submissionId, graded.feedback);
        onGraded?.(graded);
        if (!cancelled) setResult(graded.feedback);
      },
      (err: unknown) => {
        if (!cancelled) setResult({ error: err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen." });
      },
    );
    return () => {
      cancelled = true;
    };
    // The answers are fixed once handed in; the check and the task identify them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, checkId, task.id, submissionId, round, lang]);

  const feedback = saved ?? (result && !("error" in result) ? result : undefined);
  if (feedback) return <FeedbackView task={task} feedback={feedback} />;
  if (!checkId) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-note p-6 text-note-ink">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold">Få svarene vurdert av AI-sensoren</h2>
          <p className="mt-1 text-sm leading-relaxed">
            AI-sensoren hører opptakene dine, vurderer grammatikk, ordforråd og uttale og anslår nivået. Den første
            vurderingen er gratis, og abonnementene har 3, 10 eller ubegrenset i måneden.
          </p>
        </div>
        <Link href="/priser" className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]">
          Se abonnementer
        </Link>
      </section>
    );
  }
  if (result && "error" in result) {
    return (
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice" role="alert">
        <h2 className="text-lg font-semibold">Vurdering fra AI-sensoren</h2>
        <p className="mt-2 text-granite">{result.error}</p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setRound((r) => r + 1);
          }}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
        >
          Prøv igjen
        </button>
      </section>
    );
  }
  return (
    <AiPending
      startedAt={startedAt}
      expectedMs={15_000 + answers.reduce((n, a) => n + a.seconds, 0) * 120}
      stages={STAGES}
      title="AI-sensoren hører på svarene dine"
      note="Du får et anslag på nivået, tilbakemelding på uttalen og forslag til hvordan du kan si ting bedre."
    />
  );
}

/** The words the candidate was hard to understand in, with how to say them. */
function Pronunciation({ feedback, rate }: { feedback: SpeakingFeedback; rate: number }) {
  const voices = useNorwegianVoices();
  const own = textLang(feedback.lang);
  const p = feedback.pronunciation;
  if (!p) return null;
  return (
    <div className="mt-6">
      <h3 className="font-semibold">Uttale</h3>
      <p {...own} className="mt-2 leading-relaxed text-granite">
        {p.comment}
      </p>
      {p.words.length > 0 && (
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {p.words.map((w) => (
            <li key={w.word} className="flex items-start gap-3 rounded-xl p-4 ring-1 ring-ice">
              <button
                type="button"
                onClick={() => void speak(w.word, { voice: voices[0], rate: rate * 0.85 })}
                aria-label={`Hør «${w.word}»`}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-tint text-fjord transition-colors hover:bg-ice"
              >
                <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2.5 1.5v7l6-3.5z" fill="currentColor" />
                </svg>
              </button>
              <span className="min-w-0">
                <span lang="nb" className="font-semibold">
                  {w.word}
                </span>
                {w.heard && (
                  <span className="text-sm text-granite">
                    {" "}
                    · hørtes ut som <span lang="nb">«{w.heard}»</span>
                  </span>
                )}
                <span {...own} className="mt-0.5 block text-sm leading-relaxed text-granite">
                  {w.tip}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackView({ task, feedback }: { task: SpeakingTask; feedback: SpeakingFeedback }) {
  const own = textLang(feedback.lang);
  const voices = useNorwegianVoices();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-label={`Vurdering av ${task.title}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Vurdering fra AI-sensoren</h2>
        <span className="text-sm text-granite">
          {feedback.heard ? "AI-sensoren har hørt opptakene dine." : "Ut fra det vi hørte. Uttale vurderes ikke."}
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center gap-4 sm:w-24 sm:flex-col sm:gap-2">
          <div className="grid size-20 place-items-center rounded-2xl bg-fjord-deep font-display text-3xl font-medium text-snow">
            {feedback.level_estimate}
          </div>
          <p className="text-sm text-granite sm:text-center">Nivået svarene viser</p>
        </div>
        <p {...own} className="flex-1 leading-relaxed">
          {feedback.summary}
        </p>
      </div>

      {feedback.criteria && feedback.criteria.length > 0 && (
        <ul className="mt-6 divide-y divide-ice border-t border-ice">
          {feedback.criteria.map((c) => (
            <li key={c.name} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_3rem_1fr]">
              <span className="font-semibold">{c.name}</span>
              <span>
                <span className="inline-flex rounded-md bg-ice px-2 py-0.5 text-sm font-semibold text-fjord">{c.level}</span>
              </span>
              <span {...own} className="text-sm leading-relaxed text-granite">
                {c.comment}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Pronunciation feedback={feedback} rate={RATE[task.level]} />

      {feedback.improvements.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">Si det slik</h3>
          <ol className="mt-3 space-y-2.5">
            {feedback.improvements.map((e, i) => (
              <li key={i} className="rounded-xl p-4 ring-1 ring-ice">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[16px]">
                    <span className="text-rorbu line-through decoration-rorbu/50">{e.original}</span>
                    <span aria-hidden="true" className="mx-2 text-granite">
                      →
                    </span>
                    <span className="sr-only">bedre:</span>
                    <span className="font-semibold text-moss">{e.better}</span>
                  </p>
                  {e.topic && <span className="rounded-md bg-tint px-2 py-0.5 text-xs font-medium text-granite">{topicName(e.topic)}</span>}
                </div>
                <p {...own} className="mt-1.5 text-sm leading-relaxed text-granite">
                  {e.explanation}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {feedback.strengths.length > 0 && (
          <div>
            <h3 className="font-semibold">Dette gjør du bra</h3>
            <ul className="mt-2 space-y-2">
              {feedback.strengths.map((s) => (
                <li key={s} className="flex gap-3 leading-relaxed">
                  <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-moss" />
                  <span {...own}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-xl bg-fjord-deep p-5 text-snow">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Svaret ditt, forbedret</h3>
            <button
              type="button"
              onClick={async () => {
                if (playing) {
                  stopSpeaking();
                  setPlaying(false);
                  return;
                }
                setPlaying(true);
                await speak(feedback.model_answer, { voice: voices[0], rate: RATE[task.level] });
                setPlaying(false);
              }}
              className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25"
            >
              {playing ? "Stopp" : "Hør det"}
            </button>
          </div>
          <p lang="nb" className="mt-3 text-[15px] leading-relaxed text-ice">
            {feedback.model_answer}
          </p>
        </div>
      </div>
    </section>
  );
}
