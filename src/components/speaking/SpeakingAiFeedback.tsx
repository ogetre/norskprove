"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/Access";
import { AiPending } from "@/components/AiPending";
import type { SpeakingTask } from "@/content/speaking";
import { topicName } from "@/lib/feedback-topics";
import { textLang } from "@/lib/languages";
import { useNativeLanguage } from "@/lib/native-language";
import { planHasAiFeedback } from "@/lib/plans";
import { attachSpeakingFeedback, useAppState } from "@/lib/store";
import { speak, stopSpeaking, useNorwegianVoices } from "@/lib/tts";
import type { SpeakingFeedback, SpeakingTurn } from "@/lib/types";
import { countWords } from "@/lib/writing-checks";

// One request per handed-in answer set, shared by every view of it.
const requests = new Map<string, Promise<SpeakingFeedback>>();
const startedAt = new Map<string, number>();

function requestFeedback(key: string, taskId: string, turns: SpeakingTurn[], lang: string): Promise<SpeakingFeedback> {
  let request = requests.get(key);
  if (!request) {
    startedAt.set(key, Date.now());
    request = (async () => {
      const res = await fetch("/api/speaking-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, turns: turns.map(({ question, answer }) => ({ question, answer })), lang }),
      }).catch(() => null);
      if (!res) throw new Error("Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.");
      const data = (await res.json().catch(() => null)) as { feedback?: SpeakingFeedback; error?: string } | null;
      if (res.ok && data?.feedback) return data.feedback;
      throw new Error(data?.error ?? "Noe gikk galt med vurderingen. Prøv igjen.");
    })();
    requests.set(key, request);
    request.catch(() => requests.delete(key));
  }
  return request;
}

const STAGES: [from: number, label: string][] = [
  [0, "Leser svarene dine"],
  [20, "Finner det som kan sies bedre"],
  [60, "Vurderer nivået"],
  [80, "Skriver tilbakemeldingen"],
];

const RATE = { A1: 0.85, A2: 0.9, B1: 0.95, B2: 1 } as const;

/** AI assessment of the spoken answers to one task, for Premium. Saved with the answers. */
export function SpeakingAiFeedback({
  task,
  turns,
  submissionId,
}: {
  task: SpeakingTask;
  turns: SpeakingTurn[];
  submissionId?: string;
}) {
  const { plan, loading, dev } = useAccess();
  const [lang] = useNativeLanguage();
  const saved = useAppState().speaking.find((s) => submissionId && s.id === submissionId)?.feedback;
  const [result, setResult] = useState<SpeakingFeedback | { error: string } | null>(null);
  const [round, setRound] = useState(0);

  const allowed = dev || planHasAiFeedback(plan);
  const enough = countWords(turns.map((t) => t.answer).join(" ")) >= 5;
  const wanted = !loading && allowed && enough && !saved;
  const key = submissionId ?? `${task.id}:${turns.map((t) => t.answer).join("|")}`;

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    requestFeedback(key, task.id, turns, lang).then(
      (feedback) => {
        if (submissionId) attachSpeakingFeedback(submissionId, feedback);
        if (!cancelled) setResult(feedback);
      },
      (err: unknown) => {
        if (!cancelled) setResult({ error: err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen." });
      },
    );
    return () => {
      cancelled = true;
    };
    // turns are fixed for a handed-in answer set; the key identifies them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, key, task.id, submissionId, round, lang]);

  const feedback = saved ?? (result && !("error" in result) ? result : undefined);
  if (feedback) return <FeedbackView task={task} feedback={feedback} />;
  if (!loading && !allowed) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-note p-6 text-note-ink">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold">AI-vurdering av muntlig er med i Premium</h2>
          <p className="mt-1 text-sm leading-relaxed">
            AI-sensoren stiller oppfølgingsspørsmål, vurderer grammatikk og ordforråd i svarene dine og anslår nivået.
          </p>
        </div>
        <Link href="/priser" className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]">
          Oppgrader til Premium
        </Link>
      </section>
    );
  }
  if (!enough) {
    return (
      <p className="rounded-lg bg-note px-4 py-3 text-sm leading-relaxed text-note-ink">
        Vi fikk for lite tekst fra svarene til at AI-sensoren kan vurdere dem. Talegjenkjenning virker best i Chrome og Edge.
      </p>
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
      startedAt={startedAt.get(key)}
      expectedMs={14_000 + countWords(turns.map((t) => t.answer).join(" ")) * 40}
      stages={STAGES}
      title="AI-sensoren vurderer svarene dine"
      note="Du får et anslag på nivået og forslag til hvordan du kan si ting bedre."
    />
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
        <span className="text-sm text-granite">Ut fra det vi hørte. Uttale vurderes ikke.</span>
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
