"use client";

import { useEffect, useRef, useState } from "react";
import { BriefingSlide, Confirm, ExamResultScreen, ExamReview, reviveAnswers } from "@/components/exam/ExamScreens";
import { Questions } from "@/components/Questions";
import { ResumeCard } from "@/components/ResumeCard";
import { Stimulus } from "@/components/Stimulus";
import { bandAfter, examResult, KINDS, PART_NAMES, routeAfter, share, type Band, type ExamResult, type Route } from "@/lib/exam-parts";
import { briefing, drawPart, FORPROVE_MINUTES, TOTAL_MINUTES } from "@/lib/reading-exam";
import { initialAnswer, isAnswered, type Answer } from "@/lib/scoring";
import { recordAttempt } from "@/lib/store";
import type { ReadingTask } from "@/lib/types";
import { clearUnfinished, loadUnfinished, saveUnfinished, savedAtLabel } from "@/lib/unfinished";

const MINUTE = 60_000;

type Phase = "intro" | "resume" | "briefing" | "task" | "result" | "review";
type Saved = {
  parts: string[][];
  answers: Answer[][][];
  route: Route | null;
  band: Band | null;
  part: number;
  task: number;
  /** Milliseconds left of the whole test, and of the part when it is a pre-test. */
  left: number;
  partLeft: number;
  /** Whether the part had begun, or the page before it was showing. */
  begun: boolean;
  savedAt: string;
};

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The clock for part `p`, started now: the whole test's deadline, and the part's, which is earlier for a pre-test. */
function startClock(p: number, total: number, forPart: number) {
  const now = Date.now();
  return { now, deadline: now + total, partDeadline: now + (p < 2 ? Math.min(forPart, total) : total) };
}

/** The saved test with its tasks, or null if it is missing or no longer fits the task bank. */
function restore(saved: Saved | null, tasks: ReadingTask[]) {
  if (!saved || !Array.isArray(saved.parts) || !Array.isArray(saved.answers) || typeof saved.left !== "number") return null;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const parts = saved.parts.map((ids) => ids.map((id) => byId.get(id)));
  if (parts.some((p) => p.some((t) => !t))) return null;
  const ok = parts.every((p, pi) => saved.answers[pi]?.length === p.length && p.every((t, ti) => saved.answers[pi][ti]?.length === t!.questions.length));
  if (!ok || !parts[saved.part]?.[saved.task]) return null;
  return { ...saved, parts: parts as ReadingTask[][], answers: reviveAnswers(saved.answers) };
}

/**
 * The reading test the way Norskprøven runs it: two pre-tests with 15 minutes each, then one of
 * three main tests, 75 minutes in all. Within a part the learner moves freely between the tasks;
 * a finished part is closed. Only rendered inside Paywall, which mounts its children on the client.
 */
export function ReadingExam({ tasks }: { tasks: ReadingTask[] }) {
  const [restored] = useState(() => restore(loadUnfinished<Saved>("lesing"), tasks));
  const [phase, setPhase] = useState<Phase>(restored ? "resume" : "intro");
  const [parts, setParts] = useState<ReadingTask[][]>([]);
  const [answers, setAnswers] = useState<Answer[][][]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [part, setPart] = useState(0);
  const [index, setIndex] = useState(0);
  // Time left while the clock stands still (before a part), and the deadlines while it runs.
  const [left, setLeft] = useState(TOTAL_MINUTES * MINUTE);
  const [partLeft, setPartLeft] = useState(FORPROVE_MINUTES * MINUTE);
  const [deadline, setDeadline] = useState(0);
  const [partDeadline, setPartDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const used = useRef(new Set<string>());
  const consumed = useRef(0);
  const tick = useRef<() => void>(() => {});
  const top = useRef<HTMLDivElement>(null);

  const brief = (p: number, byTime = false) => {
    setPart(p);
    setIndex(0);
    setTimedOut(byTime);
    setConfirming(false);
    setPhase("briefing");
  };

  /** Starts part `p` at task `i` with the time that is left. */
  const begin = (p: number, i: number, total: number, forPart: number) => {
    const c = startClock(p, total, forPart);
    setNow(c.now);
    setDeadline(c.deadline);
    setPartDeadline(c.partDeadline);
    setPart(p);
    setIndex(i);
    setPhase("task");
    top.current?.scrollTo({ top: 0 });
  };

  const finish = (allParts: ReadingTask[][], allAnswers: Answer[][][]) => {
    const r = examResult(allParts.flat(), allAnswers.flat());
    recordAttempt({
      skill: "lesing",
      taskId: "full-lesing",
      level: r.level === "under A1" ? "A1" : r.level,
      correct: r.correct,
      total: r.total,
      mode: "full",
      result: r.level,
      scale: r.scale,
    });
    clearUnfinished("lesing");
    setConfirming(false);
    setResult(r);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  /** Closes the part, by the learner or when its time is up, and draws the next one. */
  const endPart = (byTime: boolean) => {
    const remaining = Math.max(0, deadline - Date.now());
    setLeft(remaining);
    setPartLeft(FORPROVE_MINUTES * MINUTE);
    if (part === 0) {
      const r = routeAfter(share(parts[0], answers[0]));
      const next = drawPart(tasks, "forprove2", used.current, r);
      setRoute(r);
      setParts([parts[0], next]);
      setAnswers([answers[0], next.map((t) => t.questions.map(initialAnswer))]);
      brief(1, byTime);
    } else if (part === 1) {
      const b = bandAfter(route ?? "easy", share(parts[0], answers[0]), share(parts[1], answers[1]));
      const next = drawPart(tasks, "hoved", used.current, route, b);
      setBand(b);
      setParts([parts[0], parts[1], next]);
      setAnswers([answers[0], answers[1], next.map((t) => t.questions.map(initialAnswer))]);
      brief(2, byTime);
    } else finish(parts, answers);
  };

  // One clock for the test; it reads the latest state through a ref.
  useEffect(() => {
    tick.current = () => {
      const t = Date.now();
      setNow(t);
      if (phase === "task" && partDeadline && t >= partDeadline && consumed.current !== partDeadline) {
        consumed.current = partDeadline;
        endPart(true);
      }
    };
  });
  useEffect(() => {
    if (phase !== "task") return;
    const id = setInterval(() => tick.current(), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Saved after every change and every second, so leaving the page loses nothing.
  useEffect(() => {
    if (phase !== "task" && phase !== "briefing") return;
    const running = phase === "task";
    saveUnfinished("lesing", {
      parts: parts.map((p) => p.map((t) => t.id)),
      answers,
      route,
      band,
      part,
      task: running ? index : 0,
      left: running ? Math.max(0, deadline - now) : left,
      partLeft: running ? Math.max(0, partDeadline - now) : partLeft,
      begun: running,
      savedAt: new Date().toISOString(),
    } satisfies Saved);
  }, [phase, parts, answers, route, band, part, index, left, partLeft, deadline, partDeadline, now]);

  const start = () => {
    used.current = new Set();
    const first = drawPart(tasks, "forprove1", used.current);
    setParts([first]);
    setAnswers([first.map((t) => t.questions.map(initialAnswer))]);
    setRoute(null);
    setBand(null);
    setResult(null);
    setLeft(TOTAL_MINUTES * MINUTE);
    setPartLeft(FORPROVE_MINUTES * MINUTE);
    brief(0);
  };

  const go = (i: number) => {
    setIndex(i);
    top.current?.scrollTo({ top: 0 });
  };

  /* ---------- Screens ---------- */

  if (phase === "resume" && restored) {
    const answered = restored.parts
      // An ordering question always has an order, so it doesn't count as an answer given.
      .flatMap((p, pi) => p.flatMap((t, ti) => t.questions.map((q, qi) => q.kind !== "order" && isAnswered(q, restored.answers[pi][ti][qi]))))
      .filter(Boolean).length;
    return (
      <ResumeCard
        label="Full delprøve i lesing"
        heading="Du har en uferdig leseprøve"
        details={[
          `Lagret ${savedAtLabel(restored.savedAt)}`,
          `Del ${restored.part + 1} av 3, ${PART_NAMES[KINDS[restored.part]].toLowerCase()}`,
          `${answered} svar gitt`,
          `${clock(restored.part < 2 ? Math.min(restored.partLeft, restored.left) : restored.left)} igjen av ${restored.part < 2 ? "forprøven" : "prøven"}`,
        ]}
        onContinue={() => {
          used.current = new Set(restored.parts.flat().map((t) => t.id));
          setParts(restored.parts);
          setAnswers(restored.answers);
          setRoute(restored.route);
          setBand(restored.band);
          setLeft(restored.left);
          setPartLeft(restored.partLeft);
          if (restored.begun) begin(restored.part, restored.task, restored.left, restored.partLeft);
          else brief(restored.part);
        }}
        onRestart={() => {
          clearUnfinished("lesing");
          setPhase("intro");
        }}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-10">
        <p className="text-sm text-granite">Full delprøve</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Leseprøve</h1>
        <p className="mt-3 leading-relaxed text-granite">Bygget opp som leseprøven på Norskprøven. Den tar høyst {TOTAL_MINUTES} minutter.</p>
        <ol className="mt-7 space-y-4">
          {[
            ["Forprøve 1", `Rundt åtte spørsmål på nivå A2. ${FORPROVE_MINUTES} minutter.`],
            ["Forprøve 2", `Lettere eller vanskeligere, ut fra svarene dine i forprøve 1. ${FORPROVE_MINUTES} minutter.`],
            ["Hovedprøven", "Rundt tjue spørsmål på nivå A1–A2, A2–B1 eller B1–B2, ut fra begge forprøvene. Resten av tiden."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint font-display text-sm font-medium text-fjord">{i + 1}</span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="text-granite">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <ul className="mt-7 space-y-2 border-t border-ice pt-6 text-sm leading-relaxed text-granite">
          <li>Du kan gå fram og tilbake mellom oppgavene i samme del, men ikke tilbake til en del du er ferdig med.</li>
          <li>Når tiden for en del er ute, går prøven videre av seg selv.</li>
          <li>Du ser ikke riktige svar underveis. Du får nivå og gjennomgang til slutt.</li>
        </ul>
        <button
          type="button"
          onClick={start}
          className="mt-8 rounded-md bg-rorbu px-7 py-3.5 font-medium text-white transition-colors hover:bg-[#a03022]"
        >
          Start prøven
        </button>
      </div>
    );
  }

  if (phase === "briefing") {
    const b = briefing(KINDS[part], band);
    const points = [
      ...(timedOut ? [`Tiden for ${PART_NAMES[KINDS[part - 1]].toLowerCase()} var ute, så prøven gikk videre.`] : []),
      ...b.points,
      ...(part === 2 ? [`Du har ${clock(left)} igjen.`] : []),
    ];
    return (
      <BriefingSlide part={part} title={b.title} points={points}>
        <button
          type="button"
          onClick={() => begin(part, 0, left, partLeft)}
          className="rounded-md bg-snow px-6 py-3 font-medium text-ink transition-colors hover:bg-ice"
        >
          Start {b.title.split(" (")[0].toLowerCase()}
        </button>
        <span className="text-sm text-mist">Tiden starter når du trykker.</span>
      </BriefingSlide>
    );
  }

  if (phase === "result" && result) {
    return (
      <ExamResultScreen
        title="Resultat, leseprøve"
        result={result}
        parts={parts}
        answers={answers}
        route={route}
        band={band}
        backHref="/trening/lesing"
        onReview={() => setPhase("review")}
        onRestart={start}
      />
    );
  }

  if (phase === "review") {
    return <ExamReview parts={parts} answers={answers} about={(t) => `${t.level}, ${t.genre.toLowerCase()}`} onBack={() => setPhase("result")} />;
  }

  const list = parts[part];
  const task = list?.[index];
  if (phase !== "task" || !task) return null;

  const starts = list.map((_, i) => list.slice(0, i).reduce((n, t) => n + t.questions.length, 1));
  const partTotal = list.reduce((n, t) => n + t.questions.length, 0);
  const first = starts[index];
  const last = first + task.questions.length - 1;
  const timeLeft = Math.max(0, partDeadline - now);
  const lowTime = timeLeft < (part < 2 ? 2 : 5) * MINUTE;
  const unanswered = list.reduce((n, t, ti) => n + t.questions.filter((q, qi) => !isAnswered(q, answers[part][ti][qi])).length, 0);
  const lastOfPart = index === list.length - 1;
  const nextName = part < 2 ? PART_NAMES[KINDS[part + 1]].toLowerCase() : null;

  return (
    <div ref={top} className="fixed inset-0 z-40 overflow-y-auto bg-snow">
      <header className="sticky top-0 z-10 border-b border-ice bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <span className="font-semibold">Leseprøve</span>
          <span className="hidden rounded-full bg-tint px-2.5 py-0.5 text-sm text-granite sm:inline">
            Del {part + 1} av 3 · {PART_NAMES[KINDS[part]]}
            {part === 2 && band ? ` ${band}` : ""}
          </span>
          <span className="ml-auto text-sm text-granite tabular-nums">
            {first === last ? `Spørsmål ${first}` : `Spørsmål ${first}–${last}`} av {partTotal}
          </span>
          <span
            role="timer"
            aria-live="off"
            title={part < 2 ? "Tid igjen av forprøven" : "Tid igjen av prøven"}
            className={`rounded-md px-3 py-1.5 font-semibold tabular-nums ${lowTime ? "bg-rorbu/10 text-rorbu" : "bg-ice text-ink"}`}
          >
            {clock(timeLeft)}
          </span>
        </div>
        <nav aria-label="Oppgaver i denne delen" className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-8">
          {list.map((t, i) => {
            const done = t.questions.every((q, qi) => isAnswered(q, answers[part][i][qi]));
            const from = starts[i];
            const to = from + t.questions.length - 1;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Spørsmål ${from}–${to}${done ? ", besvart" : ""}`}
                className={`grid h-8 min-w-12 place-items-center rounded-md px-2 text-sm tabular-nums transition-colors ${
                  i === index ? "bg-ink text-snow" : done ? "bg-fjord/15 text-fjord" : "bg-snow text-granite ring-1 ring-ice hover:bg-ice"
                }`}
              >
                {from === to ? from : `${from}–${to}`}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <article className="lg:sticky lg:top-36 lg:self-start">
          <p className="text-sm text-granite">{task.genre}</p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">{task.title}</h1>
          <div className="mt-5">
            <Stimulus key={task.id} task={task} mode="exam" />
          </div>
        </article>
        <section aria-label="Spørsmål">
          <Questions
            questions={task.questions}
            answers={answers[part][index]}
            submitted={false}
            start={first}
            onAnswer={(qi, v) =>
              setAnswers((prev) =>
                prev.map((p, pi) => (pi !== part ? p : p.map((row, ti) => (ti !== index ? row : row.map((a, j) => (j === qi ? v : a)))))),
              )
            }
          />
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-ice pt-6">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="rounded-md px-4 py-2.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink disabled:opacity-35"
            >
              Forrige
            </button>
            {lastOfPart ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={`rounded-md px-5 py-2.5 font-medium transition-colors ${
                  part === 2 ? "bg-rorbu text-white hover:bg-[#a03022]" : "bg-ink text-snow hover:bg-fjord"
                }`}
              >
                {part === 2 ? "Lever prøven" : `Gå videre til ${nextName}`}
              </button>
            ) : (
              <button type="button" onClick={() => go(index + 1)} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
                Neste
              </button>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-granite">
            {part < 2
              ? `Du har ${FORPROVE_MINUTES} minutter på forprøven. Når tiden er ute, går prøven videre til ${nextName}, og du kan ikke endre svarene her.`
              : "Når tiden er ute, leveres prøven av seg selv."}
          </p>
        </section>
      </main>

      {confirming && (
        <Confirm
          title={part === 2 ? "Levere prøven?" : `Gå videre til ${nextName}?`}
          text={`${unanswered ? `${unanswered} spørsmål i denne delen har ikke svar. ` : ""}${
            part === 2 ? "Du kan ikke endre svarene etter at du har levert." : `Du kan ikke gå tilbake til ${PART_NAMES[KINDS[part]].toLowerCase()} etterpå.`
          }`}
          confirm={part === 2 ? "Lever" : "Gå videre"}
          onConfirm={() => {
            consumed.current = partDeadline;
            endPart(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
