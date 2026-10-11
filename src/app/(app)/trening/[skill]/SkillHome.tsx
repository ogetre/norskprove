"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelFilter, levelCounts, type LevelChoice } from "@/components/LevelFilter";
import { ResultsChart, type ResultPoint } from "@/components/ResultsChart";
import { SkillIcon } from "@/components/SkillIcon";
import { UnfinishedNote } from "@/components/SkillOverview";
import { estimateLevel } from "@/lib/levels";
import { useAppState, useHydrated } from "@/lib/store";
import { useHasUnfinished } from "@/lib/unfinished";
import { LEVELS, QUESTION_KIND_NAMES, SKILL_NAMES, type Level, type QuestionKind, type Skill } from "@/lib/types";

type TaskMeta = { id: string; title: string; level: Level; genre: string; kinds: QuestionKind[] };

const KIND_ORDER: QuestionKind[] = ["choice", "truefalse", "match", "order", "gap"];

const KIND_HINT: Record<QuestionKind, string> = {
  choice: "Les og velg ett av tre svar.",
  truefalse: "Avgjør om påstanden stemmer med teksten.",
  match: "Koble personer, annonser eller overskrifter.",
  order: "Sett setninger eller steg i riktig rekkefølge.",
  gap: "Velg ordet som passer i hullet.",
};

const MODE_NAME = { quick: "Hurtigøving", full: "Full delprøve", trial: "Prøvetest", text: "Tekst" } as const;

/** Tasks shown in the list before «Vis flere». */
const PAGE = 20;

const card = "rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-6";

export function SkillHome({
  skill,
  official,
  ready,
  tasks,
  fullMinutes,
}: {
  skill: Skill;
  official: string;
  ready: boolean;
  tasks: TaskMeta[];
  fullMinutes: number;
}) {
  const state = useAppState();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<LevelChoice>("alle");
  const unfinished = useHasUnfinished(skill);
  const [shown, setShown] = useState(PAGE);
  const attempts = hydrated ? state.attempts.filter((a) => a.skill === skill) : [];
  const level = hydrated ? estimateLevel(state, skill) : undefined;
  const fulls = attempts.filter((a) => a.mode === "full");
  const done = new Set(attempts.map((a) => a.taskId));
  const listed = tasks.filter((t) => filter === "alle" || t.level === filter);

  const points: ResultPoint[] = attempts.slice(-14).map((a) => {
    const d = new Date(a.at).toLocaleDateString("nb-NO", { day: "numeric", month: "short" }).replace(".", "");
    return {
      label: d,
      detail: `${MODE_NAME[a.mode ?? "text"]}, ${d}`,
      value: Math.round((a.correct / Math.max(1, a.total)) * 100),
    };
  });

  return (
    <>
      <nav aria-label="Brødsmuler" className="text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">
          Trening
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{SKILL_NAMES[skill]}</span>
      </nav>

      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-xl bg-tile text-white">
          <SkillIcon skill={skill} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{SKILL_NAMES[skill]}</h1>
          <p className="text-rorbu">{official}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-[1.7fr_1fr]">
        <section className={card} aria-labelledby="chart-title">
          <h2 id="chart-title" className="font-semibold">Resultatene dine</h2>
          <p className="text-sm text-granite">Prosent riktig i de siste øktene</p>
          <div className="mt-4">
            <ResultsChart points={points} />
          </div>
        </section>
        <section className={`${card} flex flex-col`} aria-labelledby="level-title">
          <h2 id="level-title" className="font-semibold">Nivået ditt</h2>
          <p className="mt-3 font-display text-6xl font-medium tracking-tight">{level ?? "–"}</p>
          <div className="mt-3 grid grid-cols-4 gap-1" aria-hidden="true">
            {LEVELS.map((l, i) => (
              <span key={l} className={`h-2 rounded-full ${level && i <= LEVELS.indexOf(level) ? "bg-fjord" : "bg-ice"}`} />
            ))}
          </div>
          <dl className="mt-auto grid grid-cols-2 gap-3 pt-6 text-sm">
            <div>
              <dt className="text-granite">Økter</dt>
              <dd className="text-xl font-semibold tabular-nums">{attempts.length}</dd>
            </div>
            <div>
              <dt className="text-granite">Siste delprøve</dt>
              <dd className="text-xl font-semibold">{fulls.at(-1)?.result ?? "–"}</dd>
            </div>
          </dl>
        </section>
      </div>

      {!ready ? (
        <div className="mt-10 rounded-2xl bg-surface p-8 text-center ring-1 ring-ice">
          <p className="text-lg font-semibold">Øvelsene i {SKILL_NAMES[skill].toLowerCase()} er under arbeid</p>
          <p className="mx-auto mt-2 max-w-md text-granite">
            Her kommer korte øvelser og en full delprøve. Begynn gjerne med lesing så lenge.
          </p>
          <Link href="/trening/lesing" className="mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
            Gå til lesing
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-12" aria-labelledby="full-title">
            <div className="relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="aurora" />
              </div>
              <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                  <h2 id="full-title" className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                    Full delprøve
                  </h2>
                  <p className="mt-3 leading-relaxed text-mist">
                    Som på prøvedagen: {fullMinutes} minutter, tidtaker og to deler. Del 1 avgjør
                    om du får A1–A2- eller B1–B2-oppgaver i del 2. Du får nivå og gjennomgang til slutt.
                  </p>
                  {unfinished && <UnfinishedNote />}
                </div>
                <Link
                  href={`/trening/${skill}/prove`}
                  className="shrink-0 self-start rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022] md:self-auto"
                >
                  {unfinished ? "Fortsett delprøven" : "Start delprøven"}
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="quick-title">
            <h2 id="quick-title" className="font-display text-2xl font-medium tracking-tight">Hurtigøving</h2>
            <p className="mt-1 text-granite">Korte øvelser på 2–5 minutter. Velg oppgavetype.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {KIND_ORDER.map((kind) => {
                const list = tasks.filter((t) => t.kinds.includes(kind));
                const solved = list.filter((t) => done.has(t.id)).length;
                return (
                  <li key={kind}>
                    <Link
                      href={`/trening/${skill}/hurtig/${kind}`}
                      className="group flex h-full flex-col rounded-2xl bg-surface p-5 ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgb(15_43_60/0.55)]"
                    >
                      <span className="font-semibold group-hover:text-fjord">{QUESTION_KIND_NAMES[kind]}</span>
                      <span className="mt-1 text-sm leading-relaxed text-granite">{KIND_HINT[kind]}</span>
                      <span className="mt-auto pt-4">
                        <span className="flex justify-between text-xs text-granite tabular-nums">
                          <span>{list.length} oppgaver</span>
                          <span>{solved} løst</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ice">
                          <span
                            className="block h-full rounded-full bg-fjord"
                            style={{ width: `${list.length ? (solved / list.length) * 100 : 0}%` }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-12" aria-labelledby="texts-title">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="texts-title" className="font-display text-2xl font-medium tracking-tight">
                  {skill === "lytting" ? "Alle opptak" : "Alle tekster"}
                </h2>
                <p className="mt-1 text-granite tabular-nums">
                  {listed.filter((t) => done.has(t.id)).length} av {listed.length} løst
                </p>
              </div>
              <LevelFilter
                value={filter}
                onChange={(l) => {
                  setFilter(l);
                  setShown(PAGE);
                }}
                counts={levelCounts(tasks)}
              />
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {listed.slice(0, shown).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/trening/${skill}/oppgave/${t.id}`}
                    className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-ice transition-colors hover:bg-ice/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ice text-xs font-medium text-fjord">
                      {t.level}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="text-xs text-granite">{t.genre}</span>
                    </span>
                    {done.has(t.id) && <span className="text-xs font-medium text-moss">Løst</span>}
                  </Link>
                </li>
              ))}
            </ul>
            {listed.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="mt-5 rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink"
              >
                Vis flere ({listed.length - shown} igjen)
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}
