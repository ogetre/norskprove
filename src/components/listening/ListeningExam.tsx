"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Questions } from "@/components/Questions";
import { BriefingSlide, ExamResultScreen, ExamReview, reviveAnswers } from "@/components/exam/ExamScreens";
import { ResumeCard } from "@/components/ResumeCard";
import { ExamSound, follow, questionsRecorded } from "@/lib/listening-audio";
import {
  answerSeconds,
  bandAfter,
  briefing,
  drawPart,
  examResult,
  GAP_SECONDS,
  KINDS,
  PART_NAMES,
  playsFor,
  readSeconds,
  routeAfter,
  share,
  type Band,
  type ExamResult,
  type Route,
} from "@/lib/listening-exam";
import { initialAnswer, isAnswered, type Answer } from "@/lib/scoring";
import { recordAttempt } from "@/lib/store";
import { useNorwegianVoices } from "@/lib/tts";
import type { ListeningTask } from "@/lib/types";
import { clearUnfinished, loadUnfinished, saveUnfinished, savedAtLabel } from "@/lib/unfinished";

type Phase = "intro" | "resume" | "briefing" | "task" | "result" | "review";
type Step = "read" | "play" | "gap" | "answer";
type Saved = {
  parts: string[][];
  answers: Answer[][][];
  route: Route | null;
  band: Band | null;
  part: number;
  task: number;
  savedAt: string;
};

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The saved test with its tasks, or null if it is missing or no longer fits the task bank. */
function restore(saved: Saved | null, tasks: ListeningTask[]) {
  if (!saved || !Array.isArray(saved.parts) || !Array.isArray(saved.answers)) return null;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const parts = saved.parts.map((ids) => ids.map((id) => byId.get(id)));
  if (parts.some((p) => p.some((t) => !t))) return null;
  const ok = parts.every((p, pi) => saved.answers[pi]?.length === p.length && p.every((t, ti) => saved.answers[pi][ti]?.length === t!.questions.length));
  if (!ok || !parts[saved.part]?.[saved.task]) return null;
  return { ...saved, parts: parts as ListeningTask[][], answers: reviveAnswers(saved.answers) };
}

function Wave({ active }: { active: boolean }) {
  return (
    <div className="flex h-12 items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${active ? "wave-bar bg-[#7fe0b8]" : "bg-white/20"}`}
          style={{ height: `${28 + ((i * 37) % 64)}%`, animationDelay: `${(i % 9) * 85}ms` }}
        />
      ))}
    </div>
  );
}

/** The recording's side of a task: the situation, where in the task we are, and what happens next. */
function AudioPanel({
  task,
  step,
  round,
  hearing,
  left,
  span,
  progress,
  onSkip,
}: {
  task: ListeningTask;
  step: Step;
  round: number;
  /** While playing: the questions read aloud, then the recording. */
  hearing: "questions" | "text";
  left: number;
  span: number;
  /** How far the recording has come, from 0 to 1. */
  progress: () => number;
  onSkip: () => void;
}) {
  const plays = playsFor(task);
  const bar = useRef<HTMLDivElement>(null);
  const listening = step === "play" && hearing === "text";

  // While the text plays the bar follows its time; otherwise it counts down to the next step.
  useEffect(() => {
    if (!listening || !bar.current) return;
    return follow(bar.current, progress);
  }, [listening, progress]);
  const steps: { id: string; label: string }[] = [
    { id: "read", label: "Les spørsmålene" },
    { id: "play1", label: plays === 1 ? "Lytt én gang" : "1. gang" },
    ...(plays === 2 ? [{ id: "play2", label: "2. gang" }] : []),
    { id: "answer", label: "Svar" },
  ];
  const currentId = step === "read" ? "read" : step === "answer" ? "answer" : step === "gap" ? "play2" : `play${round}`;
  const at = steps.findIndex((s) => s.id === currentId);
  const status =
    step === "read"
      ? `Les spørsmålene. Lyden starter om ${clock(left)}.`
      : step === "play"
        ? hearing === "questions"
          ? "Du hører spørsmålene."
          : plays === 1
            ? "Du hører teksten nå. Den spilles bare én gang."
            : `Du hører teksten nå, ${round}. gang av 2.`
        : step === "gap"
          ? `Teksten spilles en gang til om ${clock(left)}.`
          : `Svar på spørsmålene. Neste oppgave om ${clock(left)}.`;

  return (
    <div className="rounded-2xl bg-fjord-deep p-6 text-snow shadow-[0_24px_50px_-30px_rgb(15_43_60/0.7)] sm:p-7">
      <p className="text-sm text-mist">{task.genre}</p>
      <p className="mt-1 text-lg leading-snug font-medium">{task.situation}</p>

      <ol className="mt-6 flex flex-wrap gap-1.5" aria-label="Gangen i oppgaven">
        {steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === at ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === at ? "bg-snow text-ink" : i < at ? "bg-white/10 text-mist line-through decoration-white/30" : "bg-white/5 text-mist"
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <Wave active={step === "play"} />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          {listening ? (
            <div ref={bar} className="h-full w-0 rounded-full bg-[#7fe0b8]" />
          ) : (
            step !== "play" && (
              <div className="h-full rounded-full bg-white/40 transition-[width] duration-200 ease-linear" style={{ width: `${Math.max(0, Math.min(1, left / span)) * 100}%` }} />
            )
          )}
        </div>
        <p className="mt-3 text-sm text-ice" aria-live="polite">
          {status}
        </p>
      </div>

      {step === "read" && (
        <button type="button" onClick={onSkip} className="mt-5 rounded-md bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20">
          Jeg er klar, start lyden
        </button>
      )}
    </div>
  );
}

/**
 * The listening test the way Norskprøven runs it: two pre-tests, then one of three main tests,
 * with every task played by itself and no way back. Only rendered inside Paywall, which mounts
 * its children on the client.
 */
export function ListeningExam({ tasks }: { tasks: ListeningTask[] }) {
  const voices = useNorwegianVoices();
  const voicesRef = useRef(voices);
  const sound = useRef<ExamSound | null>(null);
  const engine = () => (sound.current ??= new ExamSound());
  const progress = useCallback(() => sound.current?.progress() ?? 0, []);

  const [restored] = useState(() => restore(loadUnfinished<Saved>("lytting"), tasks));
  const [phase, setPhase] = useState<Phase>(restored ? "resume" : "intro");
  const [parts, setParts] = useState<ListeningTask[][]>([]);
  const [answers, setAnswers] = useState<Answer[][][]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [part, setPart] = useState(0);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("read");
  const [round, setRound] = useState(1);
  const [deadline, setDeadline] = useState(0);
  const [span, setSpan] = useState(1);
  const [now, setNow] = useState(0);
  const [narrated, setNarrated] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [hearing, setHearing] = useState<"questions" | "text">("text");
  const used = useRef(new Set<string>());
  const consumed = useRef(0);
  const tick = useRef<() => void>(() => {});
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);
  useEffect(() => () => sound.current?.close(), []);

  const task = phase === "task" ? parts[part]?.[index] : undefined;

  const timed = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setDeadline(t + seconds * 1000);
    setSpan(seconds * 1000);
  };

  const beginTask = (p: number, i: number, list: ListeningTask[]) => {
    setPart(p);
    setIndex(i);
    setRound(1);
    setStep("read");
    // When the questions are read aloud there is less need to read them first.
    timed(questionsRecorded(list[i]) ? 6 : readSeconds(list[i]));
    setPhase("task");
    top.current?.scrollTo({ top: 0 });
  };

  const brief = (p: number) => {
    setPart(p);
    setNarrated(false);
    setDeadline(0);
    setPhase("briefing");
  };

  const finish = (allParts: ListeningTask[][], allAnswers: Answer[][][]) => {
    const r = examResult(allParts.flat(), allAnswers.flat());
    recordAttempt({
      skill: "lytting",
      taskId: "full-lytting",
      level: r.level === "under A1" ? "A1" : r.level,
      correct: r.correct,
      total: r.total,
      mode: "full",
      result: r.level,
      scale: r.scale,
    });
    clearUnfinished("lytting");
    engine().stop();
    setResult(r);
    setPhase("result");
  };

  const endPart = () => {
    if (part === 0) {
      const r = routeAfter(share(parts[0], answers[0]));
      const next = drawPart(tasks, "forprove2", used.current, r);
      setRoute(r);
      setParts([parts[0], next]);
      setAnswers([answers[0], next.map((t) => t.questions.map(initialAnswer))]);
      brief(1);
    } else if (part === 1) {
      const b = bandAfter(route ?? "easy", share(parts[0], answers[0]), share(parts[1], answers[1]));
      const next = drawPart(tasks, "hoved", used.current, route, b);
      setBand(b);
      setParts([parts[0], parts[1], next]);
      setAnswers([answers[0], answers[1], next.map((t) => t.questions.map(initialAnswer))]);
      brief(2);
    } else finish(parts, answers);
  };

  const nextTask = () => {
    engine().stop();
    if (index + 1 < parts[part].length) beginTask(part, index + 1, parts[part]);
    else endPart();
  };

  /** The timed steps move on when their time is up. */
  const advance = () => {
    if (!task) return;
    if (step === "read") setStep("play");
    else if (step === "gap") {
      setRound((r) => r + 1);
      setStep("play");
    } else if (step === "answer") nextTask();
  };

  const afterPlay = () => {
    if (!task) return;
    if (round < playsFor(task)) {
      setStep("gap");
      timed(GAP_SECONDS);
    } else {
      setStep("answer");
      timed(answerSeconds(task));
    }
  };

  // One clock for the whole test; it reads the latest state through a ref.
  useEffect(() => {
    tick.current = () => {
      const t = Date.now();
      setNow(t);
      if (!deadline || t < deadline || consumed.current === deadline) return;
      if (phase === "task" && step !== "play") {
        consumed.current = deadline;
        advance();
      } else if (phase === "briefing" && narrated) {
        consumed.current = deadline;
        beginTask(part, 0, parts[part]);
      }
    };
  });
  useEffect(() => {
    if (phase !== "task" && phase !== "briefing") return;
    const id = setInterval(() => tick.current(), 200);
    return () => clearInterval(id);
  }, [phase]);

  // As in the exam, the questions are read aloud before each playback, then the recording plays by itself.
  useEffect(() => {
    if (phase !== "task" || step !== "play" || !task) return;
    let live = true;
    void (async () => {
      if (questionsRecorded(task)) {
        setHearing("questions");
        if (!(await engine().readQuestions(task)) || !live) return;
        await new Promise((r) => setTimeout(r, 800));
        if (!live) return;
      }
      setHearing("text");
      const finished = await engine().playTask(task, voicesRef.current);
      if (live && finished) afterPlay();
    })();
    return () => {
      live = false;
      engine().stop();
    };
    // afterPlay reads the latest state; the playback restarts only for a new task or round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, round, part, index]);

  // The instruction before a part is read aloud; the part starts a few seconds after it.
  useEffect(() => {
    if (phase !== "briefing") return;
    let live = true;
    const { speech } = briefing(KINDS[part], band);
    void engine()
      .say(speech, voicesRef.current)
      .then((done) => {
        if (!live || !done) return;
        setNarrated(true);
        timed(4);
      });
    return () => {
      live = false;
      engine().stop();
    };
    // Read once per part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, part]);

  // Saved after every change, so leaving the page loses at most the task in progress.
  useEffect(() => {
    if (phase !== "task" && phase !== "briefing") return;
    saveUnfinished("lytting", {
      parts: parts.map((p) => p.map((t) => t.id)),
      answers,
      route,
      band,
      part,
      task: phase === "briefing" ? 0 : index,
      savedAt: new Date().toISOString(),
    } satisfies Saved);
  }, [phase, parts, answers, route, band, part, index]);

  const start = () => {
    engine().unlock();
    used.current = new Set();
    const first = drawPart(tasks, "forprove1", used.current);
    setParts([first]);
    setAnswers([first.map((t) => t.questions.map(initialAnswer))]);
    setRoute(null);
    setBand(null);
    setResult(null);
    brief(0);
  };

  const testSound = async () => {
    engine().unlock();
    setTesting(true);
    await engine().playTask(tasks.find((t) => t.level === "A1") ?? tasks[0], voicesRef.current, undefined, 1);
    setTesting(false);
  };

  /* ---------- Screens ---------- */

  if (phase === "resume" && restored) {
    const answered = restored.parts
      // An ordering question always has an order, so it doesn't count as an answer given.
      .flatMap((p, pi) => p.flatMap((t, ti) => t.questions.map((q, qi) => q.kind !== "order" && isAnswered(q, restored.answers[pi][ti][qi]))))
      .filter(Boolean).length;
    return (
      <ResumeCard
        label="Full delprøve i lytting"
        heading="Du har en uferdig lytteprøve"
        details={[
          `Lagret ${savedAtLabel(restored.savedAt)}`,
          `Del ${restored.part + 1} av 3, ${PART_NAMES[KINDS[restored.part]].toLowerCase()}`,
          `${answered} svar gitt`,
          "Du fortsetter fra begynnelsen av oppgaven du var på.",
        ]}
        onContinue={() => {
          engine().unlock();
          used.current = new Set(restored.parts.flat().map((t) => t.id));
          setParts(restored.parts);
          setAnswers(restored.answers);
          setRoute(restored.route);
          setBand(restored.band);
          beginTask(restored.part, restored.task, restored.parts[restored.part]);
        }}
        onRestart={() => {
          clearUnfinished("lytting");
          setPhase("intro");
        }}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-10">
        <p className="text-sm text-granite">Full delprøve</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Lytteprøve</h1>
        <p className="mt-3 leading-relaxed text-granite">Bygget opp som lytteprøven på Norskprøven. Den tar 25–40 minutter.</p>
        <ol className="mt-7 space-y-4">
          {[
            ["Forprøve 1", "Rundt åtte spørsmål på nivå A2."],
            ["Forprøve 2", "Lettere eller vanskeligere, ut fra svarene dine i forprøve 1."],
            ["Hovedprøven", "Rundt tjue spørsmål på nivå A1–A2, A2–B1 eller B1–B2, ut fra begge forprøvene."],
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
          <li>Lyden spilles av seg selv: to ganger på nivå A1–B1, bare én gang på nivå B2.</li>
          <li>Prøven går videre av seg selv, og du kan ikke gå tilbake til en oppgave.</li>
          <li>Bruk hodetelefoner og sitt et sted med ro.</li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            className="rounded-md bg-rorbu px-7 py-3.5 font-medium text-white transition-colors hover:bg-[#a03022]"
          >
            Start prøven
          </button>
          <button
            type="button"
            onClick={() => void testSound()}
            disabled={testing}
            className="rounded-md px-5 py-3.5 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice disabled:opacity-50"
          >
            {testing ? "Spiller av …" : "Test lyden"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "briefing") {
    const b = briefing(KINDS[part], band);
    return (
      <BriefingSlide part={part} title={b.title} points={b.points}>
        <button
          type="button"
          onClick={() => {
            engine().stop();
            beginTask(part, 0, parts[part]);
          }}
          className="rounded-md bg-snow px-6 py-3 font-medium text-ink transition-colors hover:bg-ice"
        >
          Start {b.title.split(" (")[0].toLowerCase()}
        </button>
        <span className="text-sm text-mist" aria-live="polite">
          {narrated ? `Starter om ${clock(deadline - now)}` : "Hør på instruksjonen …"}
        </span>
      </BriefingSlide>
    );
  }

  if (phase === "result" && result) {
    return (
      <ExamResultScreen
        title="Resultat, lytteprøve"
        result={result}
        parts={parts}
        answers={answers}
        route={route}
        band={band}
        backHref="/trening/lytting"
        onReview={() => setPhase("review")}
        onRestart={start}
      />
    );
  }

  if (phase === "review") {
    return (
      <ExamReview
        parts={parts}
        answers={answers}
        about={(t) => `${t.level}, ${playsFor(t as ListeningTask) === 1 ? "spilt av én gang" : "spilt av to ganger"}`}
        onBack={() => setPhase("result")}
      />
    );
  }

  if (!task) return null;

  const list = parts[part];
  const partTotal = list.reduce((n, t) => n + t.questions.length, 0);
  const first = list.slice(0, index).reduce((n, t) => n + t.questions.length, 1);
  const last = first + task.questions.length - 1;
  const left = Math.max(0, deadline - now);
  const allAnswered = task.questions.every((q, qi) => isAnswered(q, answers[part][index][qi]));
  const isLastTask = part === 2 && index === list.length - 1;

  return (
    <div ref={top} className="fixed inset-0 z-40 overflow-y-auto bg-snow">
      <header className="sticky top-0 z-10 border-b border-ice bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <span className="font-semibold">Lytteprøve</span>
          <span className="hidden rounded-full bg-tint px-2.5 py-0.5 text-sm text-granite sm:inline">
            Del {part + 1} av 3 · {PART_NAMES[KINDS[part]]}
            {part === 2 && band ? ` ${band}` : ""}
          </span>
          <span className="ml-auto text-sm text-granite tabular-nums">
            {first === last ? `Spørsmål ${first}` : `Spørsmål ${first}–${last}`} av {partTotal}
          </span>
        </div>
        <div className="h-1 bg-ice" aria-hidden="true">
          <div className="h-full bg-fjord transition-[width] duration-500" style={{ width: `${((first - 1) / partTotal) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        <section aria-label="Lytteteksten" className="lg:sticky lg:top-28 lg:self-start">
          <AudioPanel task={task} step={step} round={round} hearing={hearing} left={left} span={span} progress={progress} onSkip={() => {
            consumed.current = deadline;
            setStep("play");
          }} />
          <p className="mt-3 text-sm text-granite sm:hidden">
            Del {part + 1} av 3 · {PART_NAMES[KINDS[part]]}
          </p>
        </section>

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
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ice pt-6">
            <p className="text-sm text-granite">
              {step === "answer"
                ? allAnswered
                  ? "Du har svart på alt. Du kan gå videre nå."
                  : "Velg et svar på alle spørsmålene før tiden går ut."
                : "Du kan svare mens du hører."}
            </p>
            {step === "answer" && (
              <button
                type="button"
                onClick={() => {
                  consumed.current = deadline;
                  nextTask();
                }}
                className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
              >
                {isLastTask ? "Lever prøven" : index + 1 < list.length ? "Neste oppgave" : "Gå videre"}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
