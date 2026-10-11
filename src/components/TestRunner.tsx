"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { initialAnswer, totals, type Answer } from "@/lib/scoring";
import { recordAttempt } from "@/lib/store";
import { SKILL_NAMES, type ExamTask, type Level, type Skill } from "@/lib/types";
import { Questions } from "./Questions";
import { Stimulus } from "./Stimulus";

export type TestResult = Level | "under A1";

/** Where the learner is in a running test; saved so an unfinished test can be continued. */
export type RunProgress = {
  route: "easy" | "hard" | null;
  answers: Answer[][];
  current: number;
  plays: number[];
  /** Milliseconds left on the clock. */
  remaining: number;
};

/** A saved test to continue: the clock restarts from `now` with the time that was left. */
export type RunResume = Omit<RunProgress, "remaining"> & { deadline: number; now: number };

type Props = {
  skill: Skill;
  mode: "trial" | "full";
  minutes: number;
  /** Tasks shown first. In a full test the result of this part decides the next part. */
  stage1: ExamTask[];
  easy?: ExamTask[];
  hard?: ExamTask[];
  /** Rendered under the result, e.g. the subscription offer after a trial. */
  afterResult?: ReactNode;
  backHref: string;
  /** Continue a saved test instead of showing the intro. */
  resume?: RunResume;
  /** Called while the test runs, so it can be saved and continued later. */
  onProgress?: (progress: RunProgress) => void;
  /** Called when the test is handed in. */
  onFinish?: () => void;
};

const pct = (c: number, t: number) => (t ? c / t : 0);

function estimate(mode: "trial" | "full", s1: number, s2: number | null, route: "easy" | "hard" | null): TestResult {
  if (mode === "trial") return s1 >= 0.7 ? "B1" : s1 >= 0.4 ? "A2" : "A1";
  if (route === "hard") return (s2 ?? 0) >= 0.75 ? "B2" : (s2 ?? 0) >= 0.3 ? "B1" : "A2";
  if ((s2 ?? 0) >= 0.7) return "A2";
  return (s2 ?? 0) >= 0.4 ? "A1" : "under A1";
}

function Confirm({
  title,
  text,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="rise w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 id="confirm-title" className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 leading-relaxed text-granite">{text}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2.5 font-medium text-granite hover:text-ink">
            Avbryt
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function TestRunner({
  skill,
  mode,
  minutes,
  stage1,
  easy = [],
  hard = [],
  afterResult,
  backHref,
  resume,
  onProgress,
  onFinish,
}: Props) {
  const adaptive = mode === "full" && easy.length > 0 && hard.length > 0;
  const [phase, setPhase] = useState<"intro" | "test" | "result" | "review">(resume ? "test" : "intro");
  const [tasks, setTasks] = useState<ExamTask[]>(() =>
    resume?.route ? [...stage1, ...(resume.route === "hard" ? hard : easy)] : stage1,
  );
  const [route, setRoute] = useState<"easy" | "hard" | null>(resume?.route ?? null);
  const [answers, setAnswers] = useState<Answer[][]>(() => resume?.answers ?? stage1.map((t) => t.questions.map(initialAnswer)));
  const [current, setCurrent] = useState(resume?.current ?? 0);
  const [plays, setPlays] = useState<number[]>(() => resume?.plays ?? stage1.map(() => 0));
  const [deadline, setDeadline] = useState(resume?.deadline ?? 0);
  const [now, setNow] = useState(resume?.now ?? 0);
  const [dialog, setDialog] = useState<"route" | "submit" | null>(null);
  const [result, setResult] = useState<{ level: TestResult; correct: number; total: number; s1: number; s2: number | null } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  const stage2Start = adaptive && route ? stage1.length : Infinity;
  const inStage1 = current < stage1.length;
  const isLastOfStage1 = adaptive && !route && current === stage1.length - 1;
  const isLast = current === tasks.length - 1 && !isLastOfStage1;

  const finish = (finalTasks = tasks, finalAnswers = answers, finalRoute = route) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
    const s1 = totals(
      stage1.flatMap((t) => t.questions),
      finalAnswers.slice(0, stage1.length).flat(),
    );
    const rest = finalTasks.slice(stage1.length);
    const s2 = rest.length
      ? totals(
          rest.flatMap((t) => t.questions),
          finalAnswers.slice(stage1.length).flat(),
        )
      : null;
    const all = totals(
      finalTasks.flatMap((t) => t.questions),
      finalAnswers.flat(),
    );
    const level = estimate(mode, pct(s1.correct, s1.total), s2 ? pct(s2.correct, s2.total) : null, finalRoute);
    setResult({ level, correct: all.correct, total: all.total, s1: pct(s1.correct, s1.total), s2: s2 ? pct(s2.correct, s2.total) : null });
    recordAttempt({
      skill,
      taskId: `${mode}-${skill}`,
      level: level === "under A1" ? "A1" : level,
      correct: all.correct,
      total: all.total,
      mode,
      result: level,
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

  // Report where the learner is every tick, so leaving the page never loses more than a second.
  useEffect(() => {
    if (phase === "test" && now > 0) onProgress?.({ route, answers, current, plays, remaining: Math.max(0, deadline - now) });
  }, [phase, route, answers, current, plays, deadline, now, onProgress]);

  useEffect(() => {
    if (phase === "test" && now > 0 && remaining <= 0) finish();
    // finish reads the latest state; only the clock should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const go = (i: number) => {
    setCurrent(i);
    topRef.current?.scrollTo({ top: 0 });
  };

  const startStage2 = () => {
    const s1 = totals(
      stage1.flatMap((t) => t.questions),
      answers.slice(0, stage1.length).flat(),
    );
    const r = pct(s1.correct, s1.total) >= 0.6 ? "hard" : "easy";
    const extra = r === "hard" ? hard : easy;
    setRoute(r);
    setTasks([...stage1, ...extra]);
    setAnswers((prev) => [...prev, ...extra.map((t) => t.questions.map(initialAnswer))]);
    setPlays((prev) => [...prev, ...extra.map(() => 0)]);
    setDialog(null);
    go(stage1.length);
  };

  const unanswered = answers.flat().filter((a) => a === undefined || (Array.isArray(a) && a.some((v) => v === undefined))).length;

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-10">
        <p className="text-sm text-granite">{mode === "trial" ? "Gratis prøvetest" : "Full delprøve"}</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">{SKILL_NAMES[skill]}</h1>
        <ul className="mt-6 space-y-3 leading-relaxed">
          <li className="flex gap-3">
            <span className="font-semibold tabular-nums">{minutes} min</span>
            <span className="text-granite">Tiden starter når du trykker på «Start». Prøven leveres automatisk når tiden er ute.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold tabular-nums">{adaptive ? `${stage1.length}+` : tasks.length}</span>
            <span className="text-granite">
              {adaptive
                ? "oppgaver i to deler. Resultatet i del 1 avgjør om del 2 får lettere (A1–A2) eller vanskeligere (B1–B2) oppgaver, slik som på prøven."
                : "oppgaver med ulike oppgavetyper."}
            </span>
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
    const label = result.level === "under A1" ? "Under A1" : result.level;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-8 text-snow sm:p-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">{mode === "trial" ? "Resultat, prøvetest" : "Resultat, full delprøve"} i {SKILL_NAMES[skill].toLowerCase()}</p>
            <p className="mt-3 font-display text-6xl font-medium tracking-tight sm:text-7xl">{label}</p>
            <p className="mt-3 text-lg text-ice">
              {result.correct} av {result.total} poeng ({Math.round(pct(result.correct, result.total) * 100)} %)
            </p>
            {mode === "trial" && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
                Dette er et foreløpig nivå basert på en kort test. En full delprøve gir et sikrere resultat.
              </p>
            )}
            {route && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
                Del 1: {Math.round(result.s1 * 100)} % riktig, så du fikk {route === "hard" ? "B1–B2" : "A1–A2"}-oppgaver i del 2
                {result.s2 !== null && ` (${Math.round(result.s2 * 100)} % riktig)`}.
              </p>
            )}
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
      <div className="sticky top-0 z-10 border-b border-ice bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <span className="font-semibold">{SKILL_NAMES[skill]}</span>
          <span className="hidden text-sm text-granite sm:inline">
            {adaptive ? (route ? "Del 2" : "Del 1") : mode === "trial" ? "Prøvetest" : "Delprøve"}
          </span>
          <span className="ml-auto text-sm text-granite tabular-nums">
            Oppgave {current + 1} av {adaptive && !route ? `${stage1.length}+` : tasks.length}
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
            const locked = route !== null && i < stage2Start;
            const done = answers[i]?.every((a) => a !== undefined && !(Array.isArray(a) && a.some((v) => v === undefined)));
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                onClick={() => go(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Oppgave ${i + 1}${done ? ", besvart" : ""}`}
                className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm tabular-nums transition-colors disabled:opacity-35 ${
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
              disabled={current === 0 || (route !== null && current === stage2Start)}
              onClick={() => go(current - 1)}
              className="rounded-md px-4 py-2.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink disabled:opacity-35"
            >
              Forrige
            </button>
            {isLastOfStage1 ? (
              <button type="button" onClick={() => setDialog("route")} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
                Gå videre til del 2
              </button>
            ) : isLast ? (
              <button type="button" onClick={() => setDialog("submit")} className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]">
                Lever prøven
              </button>
            ) : (
              <button type="button" onClick={() => go(current + 1)} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
                Neste
              </button>
            )}
          </div>
          {inStage1 && adaptive && !route && (
            <p className="mt-4 text-sm text-granite">Når du går videre til del 2, kan du ikke endre svarene i del 1.</p>
          )}
        </section>
      </div>

      {dialog === "route" && (
        <Confirm
          title="Gå videre til del 2?"
          text="Du kan ikke gå tilbake og endre svarene i del 1. Oppgavene i del 2 tilpasses resultatet ditt."
          confirm="Gå videre"
          onConfirm={startStage2}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "submit" && (
        <Confirm
          title="Levere prøven?"
          text={
            unanswered
              ? `Du har ${unanswered} ${unanswered === 1 ? "svar" : "svar"} som ikke er fylt ut. Du kan ikke endre svarene etter at du har levert.`
              : "Du kan ikke endre svarene etter at du har levert."
          }
          confirm="Lever"
          onConfirm={() => {
            setDialog(null);
            finish();
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
