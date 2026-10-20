"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPEAKING_KIND_NAMES, type SpeakingTask } from "@/content/speaking";
import { allowanceText, sendAnswer, startCheck, useOralInfo } from "@/lib/oral-check-client";
import { useRecorder } from "@/lib/recorder";
import { checkAnswer, scriptedCount as scripted, type Answer } from "@/lib/speaking-checks";
import { addSpeaking, recordAttempt, useHydrated } from "@/lib/store";
import { speak, stopSpeaking, useNorwegianVoices } from "@/lib/tts";
import type { Level, Mode, SpeakingTurn } from "@/lib/types";
import { countWords, type Check } from "@/lib/writing-checks";
import { clock } from "../writing/WritingPractice";
import { SpeakingAiFeedback } from "./SpeakingAiFeedback";

const RATE: Record<Level, number> = { A1: 0.85, A2: 0.9, B1: 0.95, B2: 1 };

type Phase = "overview" | "ask" | "think" | "record" | "result";

const toTurns = (row: Answer[]): SpeakingTurn[] =>
  row.map((a) => ({ question: a.question, answer: a.transcript, ...(a.followUp ? { followUp: true } : {}) }));

/** Answers so far in a full oral test, saved so it can be continued from the next question. */
export type SessionProgress = { answers: Answer[][]; typedMode: boolean; checkId?: string };

function Examiner({ speaking, label }: { speaking: boolean; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-tile text-white">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <circle cx="13" cy="9.5" r="4.5" fill="currentColor" />
          <path d="M4.5 23c1.2-4.6 4.6-7 8.5-7s7.3 2.4 8.5 7" fill="currentColor" />
        </svg>
        {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-fjord/40" aria-hidden="true" />}
      </span>
      <div>
        <p className="text-sm text-mist">Sensoren</p>
        <p className="font-medium">{label}</p>
      </div>
    </div>
  );
}

function Wave({ active, tone = "light" }: { active: boolean; tone?: "light" | "red" }) {
  return (
    <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${active ? `wave-bar ${tone === "red" ? "bg-[#ff8f80]" : "bg-[#7fe0b8]"}` : "bg-white/25"}`}
          style={{ height: `${30 + ((i * 37) % 60)}%`, animationDelay: `${(i % 7) * 80}ms` }}
        />
      ))}
    </div>
  );
}

/** The picture of a picture task, to look at while preparing and answering. */
function Picture({ task, compact = false, className = "" }: { task: SpeakingTask; compact?: boolean; className?: string }) {
  if (!task.image) return null;
  return (
    <Image
      src={task.image.src}
      alt={task.image.alt}
      width={1200}
      height={876}
      sizes="(min-width: 48rem) 46rem, 100vw"
      // While answering it stays small enough to keep the answer in view.
      className={`rounded-xl bg-white ${compact ? "mx-auto h-auto max-h-[40vh] w-auto" : "h-auto w-full"} ${className}`}
    />
  );
}

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {checks.map((c) => (
        <li key={c.id} className="flex gap-2.5 text-sm leading-relaxed">
          <span aria-hidden="true" className={`mt-0.5 font-bold ${c.ok ? "text-moss" : "text-rorbu"}`}>
            {c.ok ? "✓" : "!"}
          </span>
          <span>
            <span className="font-semibold">{c.label}.</span> <span className="text-granite">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TaskResult({
  task,
  answers,
  heard,
  checks,
}: {
  task: SpeakingTask;
  answers: Answer[];
  /** What the AI examiner heard in each answer, once it has graded them. */
  heard: string[] | null;
  checks: Check[][];
}) {
  const voices = useNorwegianVoices();
  const [playing, setPlaying] = useState(false);
  const [ticked, setTicked] = useState(() => task.points.map(() => false));

  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-label={task.title}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-ice px-2 py-0.5 font-display font-medium text-fjord">{task.level}</span>
        <span className="text-granite">{SPEAKING_KIND_NAMES[task.kind]}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold">{task.title}</h2>
      <Picture task={task} className="mt-4 max-w-md" />

      <ol className="mt-5 space-y-5">
        {answers.map((a, i) => (
          <li key={i} className="rounded-xl bg-snow p-4 sm:p-5">
            <p className="font-medium">
              <span className="text-granite">{a.followUp ? "Sensoren følger opp: " : "Sensoren: "}</span>
              {a.question}
            </p>
            {a.url && <audio controls src={a.url} className="mt-3 w-full" />}
            <p className="mt-3 text-[15px] leading-relaxed">
              <span className="text-sm font-semibold text-granite">
                {a.typed ? "Svaret ditt (skrevet): " : heard ? "AI-sensoren hørte: " : "Det vi hørte: "}
              </span>
              {(a.typed ? a.transcript : (heard?.[i] ?? a.transcript)) || (
                <span className="text-granite">
                  {a.typed ? "Tomt svar." : "Ingen tekst. Talegjenkjenning virker best i Chrome og Edge. Hør på opptaket ditt."}
                </span>
              )}
            </p>
            <CheckList checks={checks[i]} />
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Fikk du med dette?</h3>
          <ul className="mt-2 space-y-1">
            {task.points.map((p, i) => (
              <li key={p}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-snow">
                  <input
                    type="checkbox"
                    checked={ticked[i]}
                    onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
                    className="size-5 accent-[var(--moss)]"
                  />
                  <span className={ticked[i] ? "text-granite line-through decoration-moss/60" : ""}>{p}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-fjord-deep p-5 text-snow">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Eksempelsvar</h3>
            <button
              type="button"
              onClick={async () => {
                if (playing) {
                  stopSpeaking();
                  setPlaying(false);
                  return;
                }
                setPlaying(true);
                await speak(task.model, { voice: voices[0], rate: RATE[task.level] });
                setPlaying(false);
              }}
              className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25"
            >
              {playing ? "Stopp" : "Hør svaret"}
            </button>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ice">{task.model}</p>
        </div>
      </div>
    </section>
  );
}

/** What happens to the recordings when the AI examiner hears them. */
const PRIVACY = "Opptakene sendes til Google Cloud i EU for vurderingen og lagres ikke der.";

/** One level for the whole test from the AI's level for each task: their mean, rounded down. */
function overallLevel(levels: string[]): string {
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const mean = levels.reduce((n, l) => n + Math.max(0, order.indexOf(l)), 0) / levels.length;
  return order[Math.floor(mean)];
}

type SessionProps = {
  tasks: SpeakingTask[];
  mode: Mode;
  fullscreen: boolean;
  after?: ReactNode;
  title: string;
  /** Continue from the first unanswered question. */
  resume?: SessionProgress;
  /** Called whenever an answer is given, so the session can be saved and continued later. */
  onProgress?: (progress: SessionProgress) => void;
  /** Called when the last answer is given. */
  onFinish?: () => void;
  /** The learner's free check: the AI examiner always grades, and the test can't start without it. */
  aiRequired?: boolean;
};

function Session({ tasks, mode, fullscreen, after, title, resume, onProgress, onFinish, aiRequired = false }: SessionProps) {
  const voices = useNorwegianVoices();
  const rec = useRecorder();
  const oral = useOralInfo();
  const pathname = usePathname();
  const [aiWanted, setAiWanted] = useState(true);
  /** The AI check the session runs under (api/oral-check): the follow-ups and the grading belong to it. */
  const [check, setCheck] = useState<string | null>(resume?.checkId ?? null);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  /** What Gemini heard in each task's answers; stays null when Claude graded the browser's transcript. */
  const [graded, setGraded] = useState<(string[] | null)[]>(() => tasks.map(() => null));
  const [levels, setLevels] = useState<(string | null)[]>(() => tasks.map(() => null));
  const ai = check !== null;
  const canCheck = oral.state === "ready" && oral.allowance.left !== 0;
  const [answers, setAnswers] = useState<Answer[][]>(() => resume?.answers ?? tasks.map(() => []));
  const [ti, setTi] = useState(() => Math.max(0, answers.findIndex((row, i) => scripted(row) < tasks[i].questions.length)));
  const [qi, setQi] = useState(() => scripted(answers[ti]));
  /** The follow-up being asked, instead of the task's question number qi. */
  const [follow, setFollow] = useState<string | null>(null);
  const [submissionIds, setSubmissionIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("overview");
  const [typedMode, setTypedMode] = useState(resume?.typedMode ?? false);
  const [typed, setTyped] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState<Check[][][] | null>(null);
  const busy = useRef(false);
  const autoStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishRef = useRef<() => void>(() => {});
  const alive = useRef(true);
  const answerStart = useRef(0);

  const task = tasks[ti];
  const question = follow ?? task.questions[qi];

  // Recordings can't be kept after the page closes, so only the text of each answer is saved.
  useEffect(() => {
    const complete = answers.every((row, i) => scripted(row) >= tasks[i].questions.length);
    if (phase !== "result" && !complete) {
      onProgress?.({ answers: answers.map((row) => row.map((a) => ({ ...a, url: null }))), typedMode, ...(check ? { checkId: check } : {}) });
    }
  }, [answers, tasks, typedMode, phase, onProgress, check]);

  useEffect(() => {
    if (phase !== "overview" && phase !== "record") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopSpeaking();
      clearTimeout(autoStop.current);
    };
  }, []);

  const finishAll = (all: Answer[][]) => {
    onFinish?.();
    // Follow-ups are short by nature, so only answers to the task's own questions are checked.
    const res = tasks.map((t, i) => all[i].map((a) => (a.followUp ? [] : checkAnswer(t, a))));
    const ids = tasks.map((t, i) => {
      const flat = res[i].flat();
      const id = addSpeaking({
        promptId: t.id,
        transcript: all[i].map((a) => a.transcript).join(" "),
        seconds: all[i].reduce((n, a) => n + a.seconds, 0),
        turns: toTurns(all[i]),
      });
      // With AI feedback on the answers, the results chart places them by its level.
      recordAttempt({
        skill: "muntlig",
        taskId: t.id,
        level: t.level,
        correct: flat.filter((c) => c.ok).length,
        total: Math.max(1, flat.length),
        mode,
        submissionId: id,
      });
      return id;
    });
    setSubmissionIds(ids);
    setResults(res);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  const ask = async (t: number, q: number, followUp: string | null = null) => {
    busy.current = true;
    setTi(t);
    setQi(q);
    setFollow(followUp);
    setPhase("ask");
    setTyped("");
    await speak(followUp ?? tasks[t].questions[q], { voice: voices[0], rate: RATE[tasks[t].level] });
    if (!alive.current) return;
    const ok = typedMode ? false : await rec.start();
    if (!ok) setTypedMode(true);
    // A follow-up wants a shorter answer than the task's own questions.
    const seconds = followUp ? Math.max(20, Math.round(tasks[t].speakSeconds * 0.6)) : tasks[t].speakSeconds;
    const start = Date.now();
    answerStart.current = start;
    setNow(start);
    setDeadline(start + seconds * 1000);
    setPhase("record");
    busy.current = false;
    // The answer is handed in automatically when the speaking time is up.
    clearTimeout(autoStop.current);
    autoStop.current = setTimeout(() => finishRef.current(), seconds * 1000);
  };

  const finishAnswer = async () => {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(autoStop.current);
    const r = typedMode
      ? { url: null, transcript: typed.trim(), seconds: Math.round((Date.now() - answerStart.current) / 1000) }
      : await rec.stop();
    const answer: Answer = {
      question,
      url: r.url,
      transcript: r.transcript,
      seconds: r.seconds,
      typed: typedMode,
      ...(follow ? { followUp: true } : {}),
    };
    let next = answers.map((row, i) => (i === ti ? [...row, answer] : row));
    setAnswers(next);

    // Like the examiner at the test, the AI hears each answer to the task's own questions and
    // asks one follow-up. What it heard replaces the browser's transcript.
    if (check && !follow && (answer.url || countWords(answer.transcript) >= 3)) {
      setPhase("think");
      const heard = await sendAnswer(check, task.id, answers[ti], answer, true);
      if (!alive.current) return;
      if (heard?.transcript && !answer.typed && heard.transcript !== answer.transcript) {
        const better = { ...answer, transcript: heard.transcript };
        next = next.map((row, i) => (i === ti ? [...row.slice(0, -1), better] : row));
        setAnswers(next);
      }
      if (heard?.followUp) {
        void ask(ti, qi, heard.followUp);
        return;
      }
    }
    busy.current = false;
    setFollow(null);
    if (qi + 1 < task.questions.length) {
      void ask(ti, qi + 1);
    } else if (ti + 1 < tasks.length) {
      setTi(ti + 1);
      setQi(0);
      setNow(Date.now());
      setDeadline(Date.now() + tasks[ti + 1].prepSeconds * 1000);
      setPhase("overview");
    } else {
      finishAll(next);
    }
  };

  useEffect(() => {
    finishRef.current = () => void finishAnswer();
  });

  /** Starts the first question, and the AI check first when the learner wants one. */
  const begin = async () => {
    if (busy.current) return;
    if ((aiWanted || aiRequired) && !check) {
      busy.current = true;
      setStarting(true);
      const started = await startCheck(tasks.map((t) => t.id));
      busy.current = false;
      setStarting(false);
      if (!alive.current) return;
      if ("id" in started) setCheck(started.id);
      else {
        setCheckNote(started.error);
        if (aiRequired) return;
      }
    }
    void ask(ti, qi);
  };

  const fresh = answers.every((row) => row.length === 0);

  const remaining = deadline - now;

  if (phase === "result" && results) {
    const passed = results.flat(2).filter((c) => c.ok).length;
    const overall = check && levels.every(Boolean) ? overallLevel(levels as string[]) : null;
    return (
      <div className="space-y-6">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">{title}</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {overall ? `Nivå ${overall}` : check ? "AI-sensoren vurderer …" : `${passed} av ${results.flat(2).length} krav`}
            </p>
            <p className="mt-2 text-ice">
              {answers.flat().length} svar
              {answers.flat().every((a) => a.typed)
                ? " (skrevet)"
                : `, ${answers.flat().reduce((n, a) => n + (a.typed ? 0 : a.seconds), 0)} sekunder taletid`}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist">
              {!check
                ? "Hør på opptakene dine og sammenlign med eksempelsvarene."
                : !levels.every(Boolean)
                  ? "AI-sensoren vurderer svarene dine …"
                  : graded.every(Boolean)
                    ? "AI-sensoren har hørt opptakene og vurdert grammatikk, ordforråd, sammenheng og uttale."
                    : "AI-sensoren har vurdert det nettleseren oppfattet av svarene. Uttalen ble ikke vurdert denne gangen."}
            </p>
          </div>
        </div>
        {after}
        {tasks.map((t, i) => (
          <div key={t.id} className="space-y-4">
            <TaskResult task={t} answers={answers[i]} heard={graded[i]} checks={results[i]} />
            <SpeakingAiFeedback
              task={t}
              answers={answers[i]}
              checkId={check}
              submissionId={submissionIds[i]}
              onGraded={(g) => {
                setGraded((prev) => prev.map((x, j) => (j === i ? g.transcripts : x)));
                setLevels((prev) => prev.map((x, j) => (j === i ? g.feedback.level_estimate : x)));
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  const prepLeft = deadline ? deadline - now : task.prepSeconds * 1000;
  const body = (
    <div className="mx-auto w-full max-w-3xl">
      {tasks.length > 1 && (
        <p className="mb-4 text-sm text-granite tabular-nums">
          Del {ti + 1} av {tasks.length}
        </p>
      )}

      {phase === "overview" ? (
        <div className="rise rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-ice px-2 py-0.5 font-display font-medium text-fjord">{task.level}</span>
            <span className="text-granite">{SPEAKING_KIND_NAMES[task.kind]}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">{task.title}</h2>
          <p className="mt-3 text-lg leading-relaxed">{task.intro}</p>
          <Picture task={task} className="mt-5 ring-1 ring-ice" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-granite">Snakk om</p>
              <ul className="mt-2 space-y-1.5">
                {task.points.map((p) => (
                  <li key={p} className="flex gap-2.5 leading-snug">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rorbu" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-granite">Nyttige uttrykk</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {task.phrases.map((p) => (
                  <li key={p} className="rounded-md bg-snow px-2.5 py-1 text-sm">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void begin()}
              disabled={starting}
              className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022] disabled:opacity-60"
            >
              {starting ? "Starter …" : "Jeg er klar"}
            </button>
            <span className="text-sm text-granite tabular-nums">
              {deadline ? `Forberedelse: ${clock(Math.max(0, prepLeft))}` : `${task.prepSeconds} sekunder forberedelse anbefales`}
            </span>
            {typedMode && <span className="text-sm text-warn">Du skriver svarene fordi mikrofonen ikke er tilgjengelig.</span>}
          </div>
          {check ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-granite">
              <span aria-hidden="true" className="size-2 rounded-full bg-moss" />
              AI-sensoren hører og vurderer denne prøven.
            </p>
          ) : aiRequired ? (
            <p className="mt-6 text-sm leading-relaxed text-granite">
              AI-sensoren stiller oppfølgingsspørsmål og vurderer prøven. Dette er den gratis vurderingen din.{" "}
              {oral.state === "ready" && oral.heard && PRIVACY}
            </p>
          ) : fresh && oral.state === "ready" ? (
            canCheck ? (
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-snow p-4">
                <input
                  type="checkbox"
                  checked={aiWanted}
                  onChange={(e) => setAiWanted(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--fjord)]"
                />
                <span>
                  <span className="block font-medium">La AI-sensoren høre og vurdere svarene</span>
                  <span className="text-sm text-granite">
                    Som på prøven stiller sensoren oppfølgingsspørsmål. Til slutt får du nivå
                    {oral.heard ? ", tilbakemelding på uttalen" : ""} og forslag til hvordan du kan si ting bedre.{" "}
                    {allowanceText(oral.allowance)} {oral.heard && PRIVACY}
                  </span>
                </span>
              </label>
            ) : (
              <p className="mt-6 text-sm leading-relaxed text-granite">
                {allowanceText(oral.allowance)}{" "}
                <Link href="/priser" className="font-medium text-fjord underline-offset-4 hover:underline">
                  Se abonnementer
                </Link>
              </p>
            )
          ) : fresh && oral.state === "signed-out" ? (
            <p className="mt-6 text-sm leading-relaxed text-granite">
              <Link href={`/logg-inn?redirect_url=${encodeURIComponent(pathname)}`} className="font-medium text-fjord underline-offset-4 hover:underline">
                Logg inn
              </Link>{" "}
              for å få svarene vurdert av AI-sensoren. Den første vurderingen er gratis.
            </p>
          ) : null}
          {checkNote && <p className="mt-3 text-sm text-warn">{checkNote}</p>}
          {!typedMode && (
            <button
              type="button"
              onClick={() => setTypedMode(true)}
              className="mt-4 text-sm text-granite underline underline-offset-4 hover:text-ink"
            >
              Har du ikke mikrofon? Skriv svarene i stedet.
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-fjord-deep p-6 text-snow shadow-[0_30px_60px_-30px_rgb(15_43_60/0.7)] sm:p-8">
          <Examiner
            speaking={phase === "ask"}
            label={phase === "ask" ? "Stiller et spørsmål …" : phase === "think" ? "Tenker på et oppfølgingsspørsmål …" : "Lytter til svaret ditt"}
          />
          <p
            className={`mt-6 font-display text-2xl leading-snug font-medium tracking-tight transition-opacity sm:text-3xl ${phase === "think" ? "opacity-40" : ""}`}
          >
            «{question}»
          </p>
          <Picture task={task} compact className="mt-6" />

          {phase === "record" && (
            <div className="rise mt-8">
              {typedMode ? (
                <>
                  <label htmlFor="typed-answer" className="text-sm text-mist">
                    Skriv det du ville sagt
                  </label>
                  <textarea
                    id="typed-answer"
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="mt-2 block min-h-32 w-full rounded-xl bg-surface p-4 text-ink focus:outline-none"
                  />
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-rorbu">
                    <span className="absolute inset-0 animate-ping rounded-full bg-rorbu/50" aria-hidden="true" />
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="relative">
                      <rect x="7" y="2" width="6" height="11" rx="3" fill="#fff" />
                      <path d="M4 9.5a6 6 0 0012 0M10 15.5V18" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <Wave active tone="red" />
                    <p className="mt-1 text-sm text-mist">Opptak pågår. Snakk tydelig.</p>
                  </div>
                </div>
              )}
              {!typedMode && rec.live && (
                <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm leading-relaxed text-ice" aria-live="polite">
                  {rec.live}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span role="timer" className="rounded-md bg-white/10 px-3 py-1.5 font-semibold tabular-nums">
                  {clock(Math.max(0, remaining))}
                </span>
                <button
                  type="button"
                  onClick={() => void finishAnswer()}
                  className="rounded-md bg-surface px-5 py-2.5 font-medium text-ink transition-colors hover:bg-ice"
                >
                  {(ai && !follow) || qi + 1 < task.questions.length
                    ? "Ferdig, neste spørsmål"
                    : ti + 1 < tasks.length
                      ? "Ferdig, neste del"
                      : "Ferdig"}
                </button>
              </div>
            </div>
          )}
          {(phase === "ask" || phase === "think") && (
            <div className="mt-8" aria-live="polite">
              <Wave active={phase === "ask"} />
              {phase === "think" && <p className="mt-2 text-sm text-mist">Et øyeblikk …</p>}
            </div>
          )}
          {rec.error && <p className="mt-4 text-sm text-[#ffb4a8]">{rec.error}</p>}
        </div>
      )}
    </div>
  );

  if (!fullscreen) return body;
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-snow">
      <div className="sticky top-0 z-10 border-b border-ice bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <span className="font-semibold">{title}</span>
          <span className="ml-auto text-sm text-granite tabular-nums">
            Del {ti + 1} av {tasks.length}, spørsmål {qi + 1} av {task.questions.length}
            {follow ? " (oppfølging)" : ""}
          </span>
        </div>
      </div>
      <div className="px-4 py-10 sm:px-8">{body}</div>
    </div>
  );
}

/** Spoken practice: the examiner asks out loud, you answer into the microphone. */
export function SpeakingSession(props: Omit<SessionProps, "fullscreen"> & { fullscreen?: boolean }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-80 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;
  return <Session {...props} fullscreen={props.fullscreen ?? false} />;
}
