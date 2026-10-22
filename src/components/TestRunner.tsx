"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { bandStart } from "@/lib/progress-chart";
import { initialAnswer, totals, type Answer } from "@/lib/scoring";
import { recordAttempt } from "@/lib/store";
import { SKILL_NAMES, type ExamTask, type Level, type Skill } from "@/lib/types";
import { Confirm } from "./exam/ExamScreens";
import { Questions } from "./Questions";
import { Stimulus } from "./Stimulus";

type Props = {
  skill: Skill;
  minutes: number;
  tasks: ExamTask[];
  /** Rendered under the result, e.g. the subscription offer after the trial. */
  afterResult?: ReactNode;
  backHref: string;
};

const pct = (c: number, t: number) => (t ? c / t : 0);

/**
 * The level for a share of points: A1, A2 or B1 from the thresholds between them, and how far
 * into that level the share reaches, for the results chart.
 */
function estimate(share: number) {
  const [level, from, to]: [Level, number, number] = share >= 0.7 ? ["B1", 0.7, 1] : share >= 0.4 ? ["A2", 0.4, 0.7] : ["A1", 0, 0.4];
  return { level, scale: bandStart(level) + Math.min(0.99, (share - from) / Math.max(0.01, to - from)) };
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The free trial test: a few tasks on a timer, then a first estimate of the level. The full tests
 * are ReadingExam and ListeningExam, built like Norskprøven.
 */
export function TestRunner({ skill, minutes, tasks, afterResult, backHref }: Props) {
  const [phase, setPhase] = useState<"intro" | "test" | "result" | "review">("intro");
  const [answers, setAnswers] = useState<Answer[][]>(() => tasks.map((t) => t.questions.map(initialAnswer)));
  const [current, setCurrent] = useState(0);
  const [plays, setPlays] = useState<number[]>(() => tasks.map(() => 0));
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ level: Level; correct: number; total: number } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  const isLast = current === tasks.length - 1;

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const all = totals(
      tasks.flatMap((t) => t.questions),
      answers.flat(),
    );
    const { level, scale } = estimate(pct(all.correct, all.total));
    setResult({ level, correct: all.correct, total: all.total });
    recordAttempt({
      skill,
      taskId: `trial-${skill}`,
      level,
      correct: all.correct,
      total: all.total,
      mode: "trial",
      result: level,
      scale,
    });
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  // Countdown; the test is handed in automatically when time runs out.
  useEffect(() => {
    if (phase !== "test") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = deadline - now;

  useEffect(() => {
    if (phase === "test" && now > 0 && remaining <= 0) finish();
    // finish reads the latest state; only the clock should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const go = (i: number) => {
    setCurrent(i);
    topRef.current?.scrollTo({ top: 0 });
  };

  const unanswered = answers.flat().filter((a) => a === undefined || (Array.isArray(a) && a.some((v) => v === undefined))).length;

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-10">
        <p className="text-sm text-granite">Gratis prøvetest</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">{SKILL_NAMES[skill]}</h1>
        <ul className="mt-6 space-y-3 leading-relaxed">
          <li className="flex gap-3">
            <span className="font-semibold tabular-nums">{minutes} min</span>
            <span className="text-granite">Tiden starter når du trykker på «Start». Prøven leveres automatisk når tiden er ute.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold tabular-nums">{tasks.length}</span>
            <span className="text-granite">oppgaver med ulike oppgavetyper.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold">Svar</span>
            <span className="text-granite">Du ser ikke riktige svar underveis. Du får resultat og gjennomgang når du leverer.</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => {
            const t = Date.now();
            setDeadline(t + minutes * 60_000);
            setNow(t);
            setPhase("test");
          }}
          className="mt-8 rounded-md bg-rorbu px-7 py-3.5 font-medium text-white transition-colors hover:bg-[#a03022]"
        >
          Start prøven
        </button>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-8 text-snow sm:p-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">Resultat, prøvetest i {SKILL_NAMES[skill].toLowerCase()}</p>
            <p className="mt-3 font-display text-6xl font-medium tracking-tight sm:text-7xl">{result.level}</p>
            <p className="mt-3 text-lg text-ice">
              {result.correct} av {result.total} poeng ({Math.round(pct(result.correct, result.total) * 100)} %)
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
              Dette er et foreløpig nivå basert på en kort test. En full delprøve gir et sikrere resultat.
            </p>
          </div>
        </div>

        {afterResult}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPhase("review")}
            className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
          >
            Se gjennomgang
          </button>
          <Link href={backHref} className="rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice hover:text-ink">
            Tilbake
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "review") {
    const starts = tasks.map((_, ti) => 1 + tasks.slice(0, ti).reduce((sum, t) => sum + t.questions.length, 0));
    return (
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => setPhase("result")} className="text-sm text-granite underline-offset-4 hover:text-ink hover:underline">
          Tilbake til resultatet
        </button>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Gjennomgang</h1>
        <ol className="mt-8 space-y-14">
          {tasks.map((t, ti) => {
            const start = starts[ti];
            return (
              <li key={t.id} className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-sm text-granite">
                    Oppgave {ti + 1}, {t.level}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{t.title}</h2>
                  <div className="mt-4">
                    <Stimulus task={t} mode="review" />
                  </div>
                </div>
                <Questions questions={t.questions} answers={answers[ti]} submitted onAnswer={() => {}} start={start} />
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const task = tasks[current];
  const firstQ = tasks.slice(0, current).reduce((n, t) => n + t.questions.length, 1);
  const lowTime = remaining < 5 * 60_000;

  return (
    <div ref={topRef} className="fixed inset-0 z-40 overflow-y-auto bg-snow">
      <div className="sticky top-0 z-10 border-b border-ice bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <span className="font-semibold">{SKILL_NAMES[skill]}</span>
          <span className="hidden text-sm text-granite sm:inline">Prøvetest</span>
          <span className="ml-auto text-sm text-granite tabular-nums">
            Oppgave {current + 1} av {tasks.length}
          </span>
          <span
            role="timer"
            aria-live="off"
            className={`rounded-md px-3 py-1.5 font-semibold tabular-nums ${lowTime ? "bg-rorbu/10 text-rorbu" : "bg-ice text-ink"}`}
          >
            {clock(remaining)}
          </span>
        </div>
        <nav aria-label="Oppgaver" className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-8">
          {tasks.map((t, i) => {
            const done = answers[i]?.every((a) => a !== undefined && !(Array.isArray(a) && a.some((v) => v === undefined)));
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => go(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Oppgave ${i + 1}${done ? ", besvart" : ""}`}
                className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm tabular-nums transition-colors ${
                  i === current ? "bg-ink text-snow" : done ? "bg-fjord/15 text-fjord" : "bg-snow text-granite ring-1 ring-ice hover:bg-ice"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <article className="lg:sticky lg:top-36 lg:self-start">
          <p className="text-sm text-granite">{task.genre}</p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">{task.title}</h1>
          <div className="mt-5">
            <Stimulus
              key={task.id}
              task={task}
              mode="exam"
              plays={plays[current]}
              onPlay={() => setPlays((prev) => prev.map((p, i) => (i === current ? p + 1 : p)))}
            />
          </div>
        </article>
        <section aria-label="Spørsmål">
          <Questions
            questions={task.questions}
            answers={answers[current]}
            submitted={false}
            start={firstQ}
            onAnswer={(qi, v) =>
              setAnswers((prev) => prev.map((row, ti) => (ti === current ? row.map((a, j) => (j === qi ? v : a)) : row)))
            }
          />
          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => go(current - 1)}
              className="rounded-md px-4 py-2.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink disabled:opacity-35"
            >
              Forrige
            </button>
            {isLast ? (
              <button type="button" onClick={() => setConfirming(true)} className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]">
                Lever prøven
              </button>
            ) : (
              <button type="button" onClick={() => go(current + 1)} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
                Neste
              </button>
            )}
          </div>
        </section>
      </div>

      {confirming && (
        <Confirm
          title="Levere prøven?"
          text={
            unanswered
              ? `Du har ${unanswered} svar som ikke er fylt ut. Du kan ikke endre svarene etter at du har levert.`
              : "Du kan ikke endre svarene etter at du har levert."
          }
          confirm="Lever"
          onConfirm={() => {
            setConfirming(false);
            finish();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
