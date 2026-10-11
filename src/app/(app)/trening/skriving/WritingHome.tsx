"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelFilter, levelCounts, type LevelChoice } from "@/components/LevelFilter";
import { FullTestBanner, SkillOverview } from "@/components/SkillOverview";
import { useAppState, useHydrated } from "@/lib/store";
import type { Level } from "@/lib/types";

type Group = {
  kind: string;
  name: string;
  tasks: { id: string; title: string; level: Level; task: string; minWords: number; maxWords: number }[];
};

export function WritingHome({ groups, bands }: { groups: Group[]; bands: string[] }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const [level, setLevel] = useState<LevelChoice>("alle");
  const shown = groups
    .map((g) => ({ ...g, tasks: g.tasks.filter((t) => level === "alle" || t.level === level) }))
    .filter((g) => g.tasks.length > 0);
  const best = (id: string) => {
    if (!hydrated) return null;
    const tries = state.attempts.filter((a) => a.skill === "skriving" && a.taskId === id);
    return tries.length ? Math.max(...tries.map((a) => Math.round((a.correct / a.total) * 100))) : null;
  };

  return (
    <>
      <SkillOverview skill="skriving" official="Skriftlig framstilling" />

      <FullTestBanner
        skill="skriving"
        href="/trening/skriving/prove"
        title="Full delprøve"
        text={`Velg nivå som på prøven: ${bands.join(", ")}. Du skriver flere tekster med felles tidtaker og uten stavekontroll.`}
      />

      <section className="mt-12" aria-labelledby="write-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="write-title" className="font-display text-2xl font-medium tracking-tight">
              Skriv en tekst
            </h2>
            <p className="mt-1 text-granite">
              Velg en oppgave. Du får automatisk sjekk av kravene og en eksempeltekst å sammenligne med.
            </p>
          </div>
          <LevelFilter value={level} onChange={setLevel} counts={levelCounts(groups.flatMap((g) => g.tasks))} />
        </div>

        <div className="mt-6 space-y-8">
          {shown.map((g) => (
            <div key={g.kind}>
              <h3 className="font-semibold">{g.name}</h3>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {g.tasks.map((t) => {
                  const b = best(t.id);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/trening/skriving/oppgave/${t.id}`}
                        className="group flex h-full gap-4 rounded-2xl bg-surface p-5 ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgb(15_43_60/0.55)]"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-ice font-display text-sm font-medium text-fjord">
                          {t.level}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-semibold group-hover:text-fjord">{t.title}</span>
                            {b !== null && (
                              <span className="shrink-0 rounded-md bg-moss/15 px-2 py-0.5 text-xs font-medium text-moss tabular-nums">
                                {b} %
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-granite">{t.task}</span>
                          <span className="mt-2 block text-xs text-granite tabular-nums">
                            {t.minWords}–{t.maxWords} ord
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
