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
  tasks: { id: string; title: string; level: Level; intro: string; questions: number; speakSeconds: number }[];
};

export function SpeakingHome({ groups }: { groups: Group[] }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const done = new Set(hydrated ? state.attempts.filter((a) => a.skill === "muntlig").map((a) => a.taskId) : []);
  const [level, setLevel] = useState<LevelChoice>("alle");
  const shown = groups
    .map((g) => ({ ...g, tasks: g.tasks.filter((t) => level === "alle" || t.level === level) }))
    .filter((g) => g.tasks.length > 0);

  return (
    <>
      <SkillOverview skill="muntlig" official="Muntlig prøve" />

      <FullTestBanner
        skill="muntlig"
        href="/trening/muntlig/prove"
        title="Muntlig prøve"
        text="Tre deler etter hverandre, som hos sensoren: fortell om noe, et rollespill og en samtale der du sier hva du mener. Sensoren stiller spørsmålene med stemme, og du svarer i mikrofonen."
      />

      <section className="mt-12" aria-labelledby="speak-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="speak-title" className="font-display text-2xl font-medium tracking-tight">
              Øv på én oppgave
            </h2>
            <p className="mt-1 max-w-2xl text-granite">
              Du hører spørsmålet, svarer muntlig og kan lytte til opptaket ditt etterpå. Med Premium stiller AI-sensoren
              oppfølgingsspørsmål og vurderer svarene dine.
            </p>
          </div>
          <LevelFilter value={level} onChange={setLevel} counts={levelCounts(groups.flatMap((g) => g.tasks))} />
        </div>

        <div className="mt-6 space-y-8">
          {shown.map((g) => (
            <div key={g.kind}>
              <h3 className="font-semibold">{g.name}</h3>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {g.tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/trening/muntlig/oppgave/${t.id}`}
                      className="group flex h-full flex-col rounded-2xl bg-surface p-5 ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgb(15_43_60/0.55)]"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="rounded-md bg-ice px-2 py-0.5 font-display text-sm font-medium text-fjord">{t.level}</span>
                        {done.has(t.id) && <span className="text-xs font-medium text-moss">Øvd</span>}
                      </span>
                      <span className="mt-3 font-semibold group-hover:text-fjord">{t.title}</span>
                      <span className="mt-1 text-sm leading-relaxed text-granite">{t.intro}</span>
                      <span className="mt-auto pt-4 text-xs text-granite tabular-nums">
                        {t.questions} spørsmål, {t.speakSeconds} sek per svar
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
