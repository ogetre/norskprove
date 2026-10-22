"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { AccountCard } from "@/components/AccountCard";
import { useState } from "react";
import { ActivityChart, type DayCount } from "@/components/ActivityChart";
import { CountUp } from "@/components/CountUp";
import { daysUntil, estimateLevel, levelIndex } from "@/lib/levels";
import { dayKey, resetProgress, streak, useAppState, useHydrated } from "@/lib/store";
import { LEVELS, SKILL_NAMES, type AppState, type Level, type Skill } from "@/lib/types";
import { Onboarding } from "./Onboarding";
import { Readiness } from "./Readiness";

type ReadingRef = { id: string; title: string; level: Level };

const goalText: Record<string, string> = {
  statsborgerskap: "for statsborgerskap",
  "permanent-opphold": "for permanent opphold",
  jobb: "for jobb",
  studier: "for studier",
  annet: "",
};

const card = "rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-6";

function GuestBanner() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-fjord-deep p-5 text-snow sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="font-semibold">Du øver som gjest</p>
        <p className="mt-1 text-sm text-mist">
          Logg inn med Google, så lagres fremgangen på kontoen din og følger deg på alle enheter.
        </p>
      </div>
      <SignInButton>
        <button className="shrink-0 rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]">
          Logg inn med Google
        </button>
      </SignInButton>
    </div>
  );
}

function lastDays(state: AppState, n: number): DayCount[] {
  const counts = new Map<string, number>();
  for (const item of state.attempts) {
    const key = dayKey(new Date(item.at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({
      date: key,
      label: d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }).replace(".", ""),
      count: counts.get(key) ?? 0,
    });
  }
  return out;
}

function LevelMeter({ skill, level }: { skill: Skill; level?: Level }) {
  const filled = level ? levelIndex(level) + 1 : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{SKILL_NAMES[skill]}</span>
        <span className={level ? "font-semibold" : "text-sm text-granite"}>{level ?? "Ikke målt ennå"}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <span key={l} className={`h-2 rounded-full ${i < filled ? "bg-fjord" : "bg-ice"}`} />
        ))}
      </div>
    </li>
  );
}

function relativeDay(iso: string): string {
  const diff = daysUntil(dayKey(new Date(iso)));
  if (diff === 0) return "I dag";
  if (diff === -1) return "I går";
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
}

export function Dashboard({
  authEnabled,
  reading,
  titles,
}: {
  authEnabled: boolean;
  reading: ReadingRef[];
  titles: Record<string, string>;
}) {
  const state = useAppState();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);

  if (!hydrated) {
    return <div className="h-[60vh] animate-pulse rounded-2xl bg-surface/60" aria-busy="true" />;
  }

  const { profile } = state;
  const left = daysUntil(profile.examDate);
  const solved = state.attempts.length;
  // Accuracy counts reading and listening; writing and speaking are scored by requirements met.
  const answered = state.attempts.filter((a) => a.skill === "lesing" || a.skill === "lytting");
  const questions = answered.reduce((n, a) => n + a.total, 0);
  const right = answered.reduce((n, a) => n + a.correct, 0);
  const accuracy = questions ? Math.round((right / questions) * 100) : 0;
  const days = lastDays(state, 14);

  const readingLevel = estimateLevel(state, "lesing") ?? profile.targetLevel ?? "A2";
  const done = new Set(state.attempts.filter((a) => a.skill === "lesing").map((a) => a.taskId));
  const nextReading =
    reading.find((r) => r.level === readingLevel && !done.has(r.id)) ??
    reading.find((r) => !done.has(r.id)) ??
    reading[0];

  const stats = [
    { label: "Dager på rad", value: streak(state.activeDays), note: `${state.activeDays.length} ${state.activeDays.length === 1 ? "dag" : "dager"} totalt` },
    { label: "Poeng", value: state.xp, note: "Fra alle oppgaver" },
    { label: "Oppgaver løst", value: solved, note: `${days[days.length - 1].count} i dag` },
    { label: "Riktige svar", value: accuracy, suffix: "%", note: `${right} av ${questions} spørsmål` },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Min fremgang
          </h1>
          <p className="mt-2 text-granite">
            {profile.onboarded
              ? `Mål: ${profile.targetLevel ?? "B1"} ${goalText[profile.goal ?? "annet"] ?? ""}`.trim() + "."
              : "Velkommen til NorskprøveKlar."}{" "}
            {profile.onboarded && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-fjord underline underline-offset-4">
                Endre
              </button>
            )}
          </p>
        </div>
        {profile.onboarded && (
          <div className="rounded-2xl bg-fjord-deep px-6 py-4 text-snow">
            {left !== undefined && left >= 0 ? (
              <>
                <p className="font-display text-3xl font-medium tabular-nums">
                  {left} <span className="text-base text-mist">{left === 1 ? "dag" : "dager"}</span>
                </p>
                <p className="text-sm text-mist">
                  til prøven{" "}
                  {new Date(profile.examDate + "T00:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                </p>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="text-left">
                <span className="block font-semibold">Legg inn prøvedato</span>
                <span className="text-sm text-mist">Så teller vi ned for deg</span>
              </button>
            )}
          </div>
        )}
      </div>

      {authEnabled && <GuestBanner />}

      {(!profile.onboarded || editing) && (
        <div className="mt-8">
          <Onboarding profile={profile} editing={editing} onDone={() => setEditing(false)} />
        </div>
      )}

      {profile.onboarded && !editing && (
        <div className="mt-8">
          <Readiness state={state} target={profile.targetLevel ?? "B1"} />
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={card}>
            <dt className="text-sm text-granite">{s.label}</dt>
            <dd className="mt-1 text-3xl font-semibold">
              <CountUp value={s.value} />
              {s.suffix}
            </dd>
            <dd className="mt-1 text-xs text-granite">{s.note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className={card} aria-labelledby="activity-title">
          <h2 id="activity-title" className="font-semibold">Aktivitet</h2>
          <p className="text-sm text-granite">Oppgaver per dag, siste 14 dager</p>
          <div className="mt-4">
            <ActivityChart days={days} />
          </div>
        </section>

        <section className={card} aria-labelledby="levels-title">
          <h2 id="levels-title" className="font-semibold">Nivå per delprøve</h2>
          <p className="text-sm text-granite">Beregnet ut fra oppgavene du har løst</p>
          <ul className="mt-5 space-y-5">
            {(["lesing", "lytting", "skriving", "muntlig"] as Skill[]).map((s) => (
              <LevelMeter key={s} skill={s} level={estimateLevel(state, s)} />
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className={card} aria-labelledby="next-title">
          <h2 id="next-title" className="font-semibold">Neste steg</h2>
          <Link
            href={`/trening/lesing/oppgave/${nextReading.id}`}
            className="group mt-4 flex items-center gap-4 rounded-xl bg-snow p-4 transition-colors hover:bg-ice"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface font-display text-sm font-medium text-fjord ring-1 ring-ice">
              {nextReading.level}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-granite">Lesetekst</span>
              <span className="block font-semibold group-hover:text-fjord">{nextReading.title}</span>
            </span>
            <span className="text-sm font-medium text-rorbu">Start</span>
          </Link>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {([
              ["lytting", "Lytting"],
              ["skriving", "Skriving"],
              ["muntlig", "Muntlig"],
            ] as const).map(([slug, name]) => (
              <li key={slug}>
                <Link
                  href={`/trening/${slug}`}
                  className="block rounded-xl px-4 py-3 text-center font-medium ring-1 ring-ice transition-colors hover:bg-ice"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={card} aria-labelledby="recent-title">
          <h2 id="recent-title" className="font-semibold">Siste aktivitet</h2>
          {state.attempts.length === 0 ? (
            <div className="mt-4 rounded-xl bg-snow p-6 text-center">
              <p className="font-medium">Ingen oppgaver ennå</p>
              <p className="mt-1 text-sm text-granite">Løs den første leseteksten, så dukker resultatet opp her.</p>
              <Link
                href="/trening/lesing"
                className="mt-4 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-medium text-snow hover:bg-fjord"
              >
                Gå til treningen
              </Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-ice">
              {[...state.attempts]
                .reverse()
                .slice(0, 6)
                .map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ice text-xs font-medium text-fjord">
                      {a.level}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{titles[a.taskId] ?? (a.mode === "trial" ? "Prøvetest" : a.mode === "full" ? "Full delprøve" : a.taskId)}</span>
                      <span className="text-xs text-granite">
                        {SKILL_NAMES[a.skill]}, {relativeDay(a.at)}
                      </span>
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium tabular-nums ${a.correct === a.total ? "bg-moss/15 text-moss" : "bg-snow text-ink"}`}
                    >
                      {a.correct}/{a.total}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {authEnabled && <AccountCard />}

      <details className="mt-10 text-sm text-granite">
        <summary className="cursor-pointer select-none hover:text-ink">Innstillinger</summary>
        <div className="mt-3 rounded-xl bg-surface p-5 ring-1 ring-ice">
          <p>Nullstill all fremgang på denne kontoen. Dette kan ikke angres.</p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Vil du slette all fremgang? Dette kan ikke angres.")) resetProgress();
            }}
            className="mt-3 rounded-md px-4 py-2 font-medium text-rorbu ring-1 ring-rorbu/40 hover:bg-rorbu/5"
          >
            Nullstill fremgang
          </button>
        </div>
      </details>
    </>
  );
}
