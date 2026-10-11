"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPEAKING_KIND_NAMES, type SpeakingTask } from "@/content/speaking";
import { useRecorder } from "@/lib/recorder";
import { checkAnswer, type Answer } from "@/lib/speaking-checks";
import { addSpeaking, recordAttempt, useHydrated } from "@/lib/store";
import { speak, stopSpeaking, useNorwegianVoices } from "@/lib/tts";
import type { Level, Mode } from "@/lib/types";
import type { Check } from "@/lib/writing-checks";
import { clock } from "../writing/WritingPractice";

const RATE: Record<Level, number> = { A1: 0.85, A2: 0.9, B1: 0.95, B2: 1 };

type Phase = "overview" | "ask" | "record" | "result";

/** Answers so far in a full oral test, saved so it can be continued from the next question. */
export type SessionProgress = { answers: Answer[][]; typedMode: boolean };

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

function TaskResult({ task, answers, checks }: { task: SpeakingTask; answers: Answer[]; checks: Check[][] }) {
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

      <ol className="mt-5 space-y-5">
        {answers.map((a, i) => (
          <li key={i} className="rounded-xl bg-snow p-4 sm:p-5">
            <p className="font-medium">
              <span className="text-granite">Sensoren: </span>
              {a.question}
            </p>
            {a.url && <audio controls src={a.url} className="mt-3 w-full" />}
            <p className="mt-3 text-[15px] leading-relaxed">
              <span className="text-sm font-semibold text-granite">{a.typed ? "Svaret ditt (skrevet): " : "Det vi hørte: "}</span>
              {a.transcript || (
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
};

function Session({ tasks, mode, fullscreen, after, title, resume, onProgress, onFinish }: SessionProps) {
  const voices = useNorwegianVoices();
  const rec = useRecorder();
  const [answers, setAnswers] = useState<Answer[][]>(() => resume?.answers ?? tasks.map(() => []));
  const [ti, setTi] = useState(() => Math.max(0, answers.findIndex((row, i) => row.length < tasks[i].questions.length)));
  const [qi, setQi] = useState(() => answers[ti].length);
  const [phase, setPhase] = useState<Phase>("overview");
  const [typedMode, setTypedMode] = useState(resume?.typedMode ?? false);
  const [typed, setTyped] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState<Check[][][] | null>(null);
  const busy = useRef(false);
  const autoStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishRef = useRef<() => void>(() => {});

  const task = tasks[ti];
  const question = task.questions[qi];

  // Recordings can't be kept after the page closes, so only the text of each answer is saved.
  useEffect(() => {
    const complete = answers.every((row, i) => row.length >= tasks[i].questions.length);
    if (phase !== "result" && !complete) {
      onProgress?.({ answers: answers.map((row) => row.map((a) => ({ ...a, url: null }))), typedMode });
    }
  }, [answers, tasks, typedMode, phase, onProgress]);

  useEffect(() => {
    if (phase !== "overview" && phase !== "record") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(
    () => () => {
      stopSpeaking();
      clearTimeout(autoStop.current);
    },
    [],
  );

  const finishAll = (all: Answer[][]) => {
    onFinish?.();
    const res = tasks.map((t, i) => all[i].map((a) => checkAnswer(t, a)));
    tasks.forEach((t, i) => {
      const flat = res[i].flat();
      recordAttempt({
        skill: "muntlig",
        taskId: t.id,
        level: t.level,
        correct: flat.filter((c) => c.ok).length,
        total: Math.max(1, flat.length),
        mode,
      });
      addSpeaking({
        promptId: t.id,
        transcript: all[i].map((a) => a.transcript).join(" "),
        seconds: all[i].reduce((n, a) => n + a.seconds, 0),
      });
    });
    setResults(res);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  const ask = async (t: number, q: number) => {
    busy.current = true;
    setTi(t);
    setQi(q);
    setPhase("ask");
    setTyped("");
    await speak(tasks[t].questions[q], { voice: voices[0], rate: RATE[tasks[t].level] });
    const ok = typedMode ? false : await rec.start();
    if (!ok) setTypedMode(true);
    const start = Date.now();
    setNow(start);
    setDeadline(start + tasks[t].speakSeconds * 1000);
    setPhase("record");
    busy.current = false;
    // The answer is handed in automatically when the speaking time is up.
    clearTimeout(autoStop.current);
    autoStop.current = setTimeout(() => finishRef.current(), tasks[t].speakSeconds * 1000);
  };

  const finishAnswer = async () => {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(autoStop.current);
    const r = typedMode
      ? { url: null, transcript: typed.trim(), seconds: Math.round((Date.now() - (deadline - task.speakSeconds * 1000)) / 1000) }
      : await rec.stop();
    const answer: Answer = { question, url: r.url, transcript: r.transcript, seconds: r.seconds, typed: typedMode };
    const next = answers.map((row, i) => (i === ti ? [...row, answer] : row));
    setAnswers(next);
    busy.current = false;
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

  const remaining = deadline - now;

  if (phase === "result" && results) {
    return (
      <div className="space-y-6">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">{title}</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {results.flat(2).filter((c) => c.ok).length} av {results.flat(2).length} krav
            </p>
            <p className="mt-2 text-ice">
              {answers.flat().length} svar
              {answers.flat().every((a) => a.typed)
                ? " (skrevet)"
                : `, ${answers.flat().reduce((n, a) => n + (a.typed ? 0 : a.seconds), 0)} sekunder taletid`}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist">
              Hør på opptakene dine og sammenlign med eksempelsvarene. Vurdering av uttale og grammatikk kommer snart.
            </p>
          </div>
        </div>
        {after}
        {tasks.map((t, i) => (
          <TaskResult key={t.id} task={t} answers={answers[i]} checks={results[i]} />
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
              onClick={() => void ask(ti, qi)}
              className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
            >
              Jeg er klar
            </button>
            <span className="text-sm text-granite tabular-nums">
              {deadline ? `Forberedelse: ${clock(Math.max(0, prepLeft))}` : `${task.prepSeconds} sekunder forberedelse anbefales`}
            </span>
            {typedMode && <span className="text-sm text-warn">Du skriver svarene fordi mikrofonen ikke er tilgjengelig.</span>}
          </div>
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
          <Examiner speaking={phase === "ask"} label={phase === "ask" ? "Stiller et spørsmål …" : "Lytter til svaret ditt"} />
          <p className="mt-6 font-display text-2xl leading-snug font-medium tracking-tight sm:text-3xl">«{question}»</p>

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
                  {qi + 1 < task.questions.length ? "Ferdig, neste spørsmål" : ti + 1 < tasks.length ? "Ferdig, neste del" : "Ferdig"}
                </button>
              </div>
            </div>
          )}
          {phase === "ask" && (
            <div className="mt-8">
              <Wave active />
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
