"use client";

import Link from "next/link";
import { ResultsChart, type ResultPoint } from "./ResultsChart";
import { SkillIcon } from "./SkillIcon";
import { estimateLevel } from "@/lib/levels";
import { useAppState, useHydrated } from "@/lib/store";
import { LEVELS, SKILL_NAMES, type Skill } from "@/lib/types";
import { useHasUnfinished } from "@/lib/unfinished";

const MODE_NAME = { quick: "Øving", full: "Full delprøve", trial: "Prøvetest", text: "Oppgave" } as const;

const card = "rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-6";

/** Breadcrumbs, title, results chart and level for one part of the exam. */
export function SkillOverview({ skill, official }: { skill: Skill; official: string }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const attempts = hydrated ? state.attempts.filter((a) => a.skill === skill) : [];
  const level = hydrated ? estimateLevel(state, skill) : undefined;
  const fulls = attempts.filter((a) => a.mode === "full");

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
          <p className="text-sm text-granite">
            {skill === "skriving" || skill === "muntlig" ? "Prosent oppfylte krav" : "Prosent riktig"} i de siste øktene
          </p>
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
              <dt className="text-granite">Fulle delprøver</dt>
              <dd className="text-xl font-semibold tabular-nums">{fulls.length}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}

/** Dark banner that starts the full, exam-like test for a skill. */
export function FullTestBanner({ skill, href, title, text }: { skill: Skill; href: string; title: string; text: string }) {
  const unfinished = useHasUnfinished(skill);
  return (
    <section className="mt-12" aria-label={title}>
      <div className="relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-3 leading-relaxed text-mist">{text}</p>
            {unfinished && <UnfinishedNote />}
          </div>
          <Link
            href={href}
            className="shrink-0 self-start rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022] md:self-auto"
          >
            {unfinished ? "Fortsett delprøven" : "Start delprøven"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Shown on a full-test banner when a test was left unfinished on this device. */
export function UnfinishedNote() {
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-ice">
      <span aria-hidden="true" className="size-2 rounded-full bg-[#f0b04a]" />
      Du har en uferdig delprøve. Du kan fortsette eller starte en ny.
    </p>
  );
}
