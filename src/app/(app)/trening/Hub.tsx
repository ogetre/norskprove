"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { SkillIcon, SKILLS } from "@/components/SkillIcon";
import { collectDrills } from "@/lib/error-drills";
import { estimateLevel } from "@/lib/levels";
import { reviewQueue } from "@/lib/srs";
import { useAppState, useHydrated } from "@/lib/store";
import { SKILL_NAMES } from "@/lib/types";

function Name() {
  const { user } = useUser();
  return user?.firstName ? <>, {user.firstName}</> : null;
}

function DueBadge({ n }: { n: number }) {
  return n > 0 ? (
    <span className="shrink-0 rounded-full bg-rorbu px-3 py-1 text-sm font-semibold text-white tabular-nums">{n} i dag</span>
  ) : (
    <span aria-hidden="true" className="text-2xl text-granite">
      ›
    </span>
  );
}

export function Hub({ authEnabled }: { authEnabled: boolean }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const due = hydrated ? reviewQueue(state.words ?? [], state.srs).length : 0;
  const drills = hydrated ? collectDrills(state) : [];
  const drillsDue = hydrated ? reviewQueue(drills, state.srs).length : 0;

  return (
    <>
      <h1 className="rise font-display text-3xl font-medium tracking-tight sm:text-4xl">
        Hva vil du øve på i dag{authEnabled ? <Name /> : null}?
      </h1>
      <p className="rise mt-3 max-w-2xl leading-relaxed text-granite" style={{ animationDelay: "80ms" }}>
        Velg en del av Norskprøven. Du kan ta korte øvelser eller en full delprøve som på
        prøvedagen.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {SKILLS.map((s, i) => {
          const tries = hydrated ? state.attempts.filter((a) => a.skill === s.skill) : [];
          const level = hydrated ? estimateLevel(state, s.skill) : undefined;
          const lastFull = [...tries].reverse().find((a) => a.mode === "full");
          return (
            <li key={s.skill} className="rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <Link
                href={`/trening/${s.skill}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface p-6 ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgb(15_43_60/0.6)] sm:p-7"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="grid size-14 place-items-center rounded-xl bg-tile text-white transition-colors group-hover:bg-rorbu">
                    <SkillIcon skill={s.skill} />
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-3xl font-medium tracking-tight">{level ?? "–"}</span>
                    <span className="text-xs text-granite">{level ? "ditt nivå" : "ikke målt"}</span>
                  </span>
                </span>
                <span className="mt-6 text-2xl font-semibold">{SKILL_NAMES[s.skill]}</span>
                <span className="text-sm text-rorbu">{s.official}</span>
                <span className="mt-3 leading-relaxed text-granite">{s.blurb}</span>
                <span className="mt-6 flex items-center justify-between border-t border-ice pt-4 text-sm">
                  <span className="text-granite">
                    {tries.length ? `${tries.length} økter` : "Ingen økter ennå"}
                    {lastFull?.result ? `, siste prøve: ${lastFull.result}` : ""}
                  </span>
                  <span className="font-medium text-rorbu">Åpne</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/trening/ord"
        className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-surface px-6 py-5 ring-1 ring-ice transition-colors hover:bg-ice/50"
      >
        <span>
          <span className="block font-semibold">Mine ord</span>
          <span className="text-sm text-granite">
            {!hydrated || !state.words?.length
              ? "Lagre ord fra tekstene og repeter dem litt hver dag"
              : `${state.words.length} ord lagret`}
          </span>
        </span>
        <DueBadge n={due} />
      </Link>

      <Link
        href="/trening/feil"
        className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-surface px-6 py-5 ring-1 ring-ice transition-colors hover:bg-ice/50"
      >
        <span>
          <span className="block font-semibold">Øv på feilene dine</span>
          <span className="text-sm text-granite">
            {drills.length
              ? `${drills.length} feil fra tekstene dine`
              : "Feilene i tekstene dine blir til øvelser"}
          </span>
        </span>
        <DueBadge n={drillsDue} />
      </Link>

      <Link
        href="/oversikt"
        className="mt-3 flex items-center justify-between rounded-2xl bg-fjord-deep px-6 py-5 text-snow transition-colors hover:bg-[#13344a]"
      >
        <span>
          <span className="block font-semibold">Min fremgang</span>
          <span className="text-sm text-mist">Statistikk, aktivitet og nivå i alle delene</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-mist">
          ›
        </span>
      </Link>
    </>
  );
}
