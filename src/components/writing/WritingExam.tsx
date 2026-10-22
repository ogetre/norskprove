"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ResumeCard } from "@/components/ResumeCard";
import type { WritingTask } from "@/content/writing";
import { shuffle } from "@/lib/random";
import { addWriting, recordAttempt } from "@/lib/store";
import { clearUnfinished, loadUnfinished, saveUnfinished, savedAtLabel } from "@/lib/unfinished";
import { checkWriting, countWords, type Check } from "@/lib/writing-checks";
import { TaskCard, WordMeter } from "./WritingEditor";
import { WritingFeedback } from "./WritingFeedback";
import { clock } from "./WritingPractice";

export type ExamBand = { id: string; label: string; minutes: number; tasks: WritingTask[] };
type BandPools = { id: string; label: string; minutes: number; pools: WritingTask[][] };
type Saved = {
  band: { id: string; label: string; minutes: number; tasks: string[] };
  texts: string[];
  current: number;
  /** Milliseconds left on the clock. */
  remaining: number;
  savedAt: string;
};

/** The saved test with its prompts, or null if it is missing or no longer fits the prompts. */
function restore(saved: Saved | null, pools: BandPools[]): (Saved & { exam: ExamBand }) | null {
  if (!saved) return null;
  const byId = new Map(pools.flatMap((b) => b.pools.flat()).map((t) => [t.id, t]));
  const tasks = saved.band.tasks.map((id) => byId.get(id)).filter((t): t is WritingTask => t !== undefined);
  if (tasks.length !== saved.band.tasks.length || saved.texts.length !== tasks.length) return null;
  return { ...saved, exam: { id: saved.band.id, label: saved.band.label, minutes: saved.band.minutes, tasks } };
}

export function WritingExam({ bands: pools }: { bands: BandPools[] }) {
  // A new prompt per slot each visit. Paywall mounts this on the client only, so the draw
  // never has to match a server render.
  const [bands] = useState<ExamBand[]>(() =>
    pools.map(({ pools: slots, ...b }) => ({ ...b, tasks: slots.map((p) => shuffle(p)[0]) })),
  );
  const [saved, setSaved] = useState(() => restore(loadUnfinished<Saved>("skriving"), pools));
  const [band, setBand] = useState<ExamBand | null>(null);
  const [phase, setPhase] = useState<"choose" | "write" | "result">("choose");
  const [texts, setTexts] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [results, setResults] = useState<Check[][]>([]);
  const [submissionIds, setSubmissionIds] = useState<string[]>([]);
  const [view, setView] = useState(0);
  const done = useRef(false);

  const start = (b: ExamBand, t: number) => {
    setBand(b);
    setTexts(b.tasks.map(() => ""));
    setDeadline(t + b.minutes * 60_000);
    setNow(t);
    done.current = false;
    setPhase("write");
  };

  const finish = () => {
    if (!band || done.current) return;
    done.current = true;
    clearUnfinished("skriving");
    const all = band.tasks.map((task, i) => checkWriting(task, texts[i]));
    const ids = band.tasks.map((task, i) => {
      const passed = all[i].filter((c) => c.ok).length;
      const id = addWriting({ promptId: task.id, text: texts[i], words: countWords(texts[i]) });
      recordAttempt({
        skill: "skriving",
        taskId: task.id,
        level: task.level,
        correct: passed,
        total: all[i].length,
        mode: "full",
        submissionId: id,
      });
      return id;
    });
    setResults(all);
    setSubmissionIds(ids);
    setConfirm(false);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (phase !== "write") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = deadline - now;

  // Save the texts and the clock every tick, so the test can be continued later.
  useEffect(() => {
    if (phase !== "write" || !band || now === 0) return;
    saveUnfinished("skriving", {
      band: { id: band.id, label: band.label, minutes: band.minutes, tasks: band.tasks.map((t) => t.id) },
      texts,
      current,
      remaining: Math.max(0, deadline - now),
      savedAt: new Date().toISOString(),
    } satisfies Saved);
  }, [phase, band, texts, current, deadline, now]);

  useEffect(() => {
    if (phase === "write" && now > 0 && remaining <= 0) finish();
    // finish reads the latest texts; only the clock should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  if ((phase === "choose" || !band) && saved) {
    const words = saved.texts.reduce((n, t) => n + countWords(t), 0);
    return (
      <ResumeCard
        label="Full delprøve i skriving"
        details={[
          `${saved.band.label}, lagret ${savedAtLabel(saved.savedAt)}`,
          `Oppgave ${saved.current + 1} av ${saved.exam.tasks.length}, ${words} ord skrevet`,
          `${clock(saved.remaining)} igjen på klokka`,
        ]}
        onContinue={() => {
          const t = Date.now();
          setBand(saved.exam);
          setTexts(saved.texts);
          setCurrent(saved.current);
          setDeadline(t + saved.remaining);
          setNow(t);
          done.current = false;
          setSaved(null);
          setPhase("write");
        }}
        onRestart={() => {
          clearUnfinished("skriving");
          setSaved(null);
        }}
      />
    );
  }

  if (phase === "choose" || !band) {
    return (
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Full delprøve i skriving</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-granite">
          Som på prøven melder du deg på et nivå, og du kan ikke få et høyere resultat enn det høyeste nivået
          du velger. Velg derfor det nivået du tror du er på. Du skriver uten stavekontroll og ordbok, med én
          felles tidtaker. Til slutt får du automatisk sjekk og eksempeltekster.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {bands.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => start(b, Date.now())}
                className="group flex h-full w-full flex-col rounded-2xl bg-surface p-6 text-left ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgb(15_43_60/0.55)]"
              >
                <span className="font-display text-3xl font-medium tracking-tight">{b.label}</span>
                <span className="mt-1 text-sm text-granite tabular-nums">
                  {b.tasks.length} oppgaver, {b.minutes} minutter
                </span>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {b.tasks.map((t) => (
                    <li key={t.id} className="text-ink">
                      {t.title}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto pt-6 font-medium text-rorbu">Start prøven</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "result") {
    const totalPassed = results.reduce((n, r) => n + r.filter((c) => c.ok).length, 0);
    const total = results.reduce((n, r) => n + r.length, 0);
    return (
      <div className="space-y-6">
        <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="aurora" />
          </div>
          <div className="relative">
            <p className="text-mist">Full delprøve i skriving, {band.label}</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {totalPassed} av {total} krav
            </p>
            <p className="mt-2 text-ice">{band.tasks.length} tekster levert</p>
          </div>
        </div>
        <div role="tablist" aria-label="Tekster" className="flex flex-wrap gap-2">
          {band.tasks.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={view === i}
              onClick={() => setView(i)}
              className="rounded-full border border-ice bg-surface px-4 py-2 text-sm transition-colors hover:border-mist aria-selected:border-ink aria-selected:bg-ink aria-selected:text-snow"
            >
              Oppgave {i + 1}: {t.title}
            </button>
          ))}
        </div>
        <WritingFeedback
          key={view}
          task={band.tasks[view]}
          text={texts[view]}
          checks={results[view]}
          submissionId={submissionIds[view]}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/trening/skriving" className="inline-flex rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice hover:text-ink">
            Tilbake til skriving
          </Link>
          <p className="text-sm text-granite">Tekstene og tilbakemeldingen er lagret under «Dine tekster» på skrivesiden.</p>
        </div>
      </div>
    );
  }

  const task = band.tasks[current];
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-snow">
      <div className="sticky top-0 z-10 border-b border-ice bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <span className="font-semibold">Skriving</span>
          <span className="hidden text-sm text-granite sm:inline">{band.label}</span>
          <div role="tablist" aria-label="Oppgaver" className="ml-auto flex gap-1.5">
            {band.tasks.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={i === current}
                onClick={() => setCurrent(i)}
                className="rounded-md px-3 py-1.5 text-sm tabular-nums transition-colors aria-selected:bg-ink aria-selected:text-snow"
              >
                Oppgave {i + 1}
                <span className="ml-1.5 text-xs opacity-70">{countWords(texts[i])}</span>
              </button>
            ))}
          </div>
          <span
            role="timer"
            className={`rounded-md px-3 py-1.5 font-semibold tabular-nums ${remaining < 10 * 60_000 ? "bg-rorbu/10 text-rorbu" : "bg-ice text-ink"}`}
          >
            {clock(remaining)}
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <TaskCard task={task} />
        </div>
        <div>
          <label htmlFor="exam-text" className="sr-only">
            Tekst til oppgave {current + 1}
          </label>
          <textarea
            id="exam-text"
            key={task.id}
            value={texts[current]}
            onChange={(e) => setTexts((prev) => prev.map((t, i) => (i === current ? e.target.value : t)))}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Skriv teksten din her …"
            className="block min-h-[440px] w-full resize-y rounded-xl border-2 border-ice bg-surface p-5 text-[17px] leading-relaxed transition-colors placeholder:text-mist focus:border-fjord focus:outline-none"
          />
          <div className="mt-3">
            <WordMeter words={countWords(texts[current])} min={task.minWords} max={task.maxWords} />
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
              className="rounded-md px-4 py-2.5 font-medium text-granite ring-1 ring-ice hover:text-ink disabled:opacity-35"
            >
              Forrige oppgave
            </button>
            {current < band.tasks.length - 1 ? (
              <button type="button" onClick={() => setCurrent((c) => c + 1)} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
                Neste oppgave
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]">
                Lever prøven
              </button>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="w-confirm">
          <div className="rise w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 id="w-confirm" className="text-xl font-semibold">
              Levere prøven?
            </h2>
            <ul className="mt-3 space-y-1 text-granite">
              {band.tasks.map((t, i) => (
                <li key={t.id} className="flex justify-between tabular-nums">
                  <span>Oppgave {i + 1}</span>
                  <span>
                    {countWords(texts[i])} / {t.minWords}–{t.maxWords} ord
                  </span>
                </li>
              ))}
            </ul>
            {texts.some((t) => countWords(t) === 0) && (
              <p className="mt-3 text-sm leading-relaxed text-rorbu">
                Du har ikke skrevet noe på alle oppgavene. På prøven må du svare på alle for å få et resultat.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirm(false)} className="rounded-md px-4 py-2.5 font-medium text-granite hover:text-ink">
                Avbryt
              </button>
              <button type="button" autoFocus onClick={finish} className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]">
                Lever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
