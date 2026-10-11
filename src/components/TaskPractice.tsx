"use client";

import { useRef, useState, type ReactNode } from "react";
import { initialAnswer, isAnswered, totals, type Answer } from "@/lib/scoring";
import { recordAttempt } from "@/lib/store";
import type { ExamTask, Mode, Skill } from "@/lib/types";
import { Questions } from "./Questions";
import { Stimulus } from "./Stimulus";

/** One reading or listening task with instant feedback; `after` renders the next-step buttons once checked. */
export function TaskPractice({
  task,
  skill,
  mode,
  after,
}: {
  task: ExamTask;
  skill: Skill;
  mode: Mode;
  after: (result: { correct: number; total: number }, retry: () => void) => ReactNode;
}) {
  const [answers, setAnswers] = useState<Answer[]>(() => task.questions.map(initialAnswer));
  const [submitted, setSubmitted] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [plays, setPlays] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const { correct, total } = totals(task.questions, answers);
  const ready = task.questions.some((q, i) => isAnswered(q, answers[i]));

  const submit = () => {
    setSubmitted(true);
    recordAttempt({ skill, taskId: task.id, level: task.level, correct, total, mode });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const retry = () => {
    setAnswers(task.questions.map(initialAnswer));
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <article className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-md bg-ice px-2 py-0.5 font-display font-medium text-fjord">{task.level}</span>
          <span className="text-granite">{task.genre}</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">{task.title}</h1>
        <div className="mt-6">
          <Stimulus task={task} mode={submitted ? "review" : "practice"} plays={plays} onPlay={() => setPlays((p) => p + 1)} />
        </div>
        <button
          type="button"
          onClick={() => setShowWords((v) => !v)}
          aria-expanded={showWords}
          className="mt-4 text-sm text-fjord underline decoration-mist underline-offset-4 hover:decoration-fjord"
        >
          {showWords ? "Skjul ordforklaringer" : "Vis ordforklaringer"}
        </button>
        {showWords && (
          <dl className="mt-3 space-y-1.5 rounded-lg bg-surface p-4 text-sm ring-1 ring-ice">
            {task.glossary.map(([word, meaning]) => (
              <div key={word}>
                <dt className="inline font-semibold">{word}</dt>
                <dd className="inline text-granite"> – {meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </article>

      <section aria-label="Spørsmål">
        <Questions
          questions={task.questions}
          answers={answers}
          submitted={submitted}
          onAnswer={(i, v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
        />
        <div ref={resultRef} className="mt-10">
          {!submitted ? (
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-[background-color,opacity] hover:bg-[#a03022] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sjekk svarene
            </button>
          ) : (
            <div className="rise rounded-xl bg-fjord-deep p-6 text-snow sm:p-7">
              <p className="font-display text-3xl font-medium tabular-nums">
                {correct} av {total} riktige
              </p>
              <p className="mt-2 text-mist">
                {correct === total
                  ? "Alt riktig. Bra jobbet."
                  : correct >= total / 2
                    ? "Godt jobbet. Les forklaringene og se hva du kan gjøre bedre."
                    : "Les forklaringene nøye, og prøv igjen."}{" "}
                +{10 + correct * 5} poeng
              </p>
              <div className="mt-6 flex flex-wrap gap-3">{after({ correct, total }, retry)}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
