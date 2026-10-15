"use client";

import Link from "next/link";
import { GOAL_REQUIREMENT, partReadiness, readiness, STATUS_LABEL, type ReadinessStatus } from "@/lib/readiness";
import { SKILL_NAMES, type AppState, type Level } from "@/lib/types";

const TONE: Record<ReadinessStatus, { chip: string; bar: string }> = {
  klar: { chip: "bg-moss/15 text-moss", bar: "bg-moss" },
  trolig: { chip: "bg-fjord/10 text-fjord", bar: "bg-fjord" },
  nesten: { chip: "bg-warn/15 text-warn", bar: "bg-warn" },
  langt: { chip: "bg-rorbu/10 text-rorbu", bar: "bg-rorbu" },
  ukjent: { chip: "bg-ice text-granite", bar: "bg-ice" },
};

function Chip({ status }: { status: ReadinessStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[status].chip}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** «Er jeg klar for B1?»: each part judged against the target level, with the next step. */
export function Readiness({ state, target }: { state: AppState; target: Level }) {
  const { parts, verdict, focus } = readiness(state, target);
  const requirement = state.profile.goal ? GOAL_REQUIREMENT[state.profile.goal] : undefined;
  const required = requirement ? partReadiness(state, requirement.skill, requirement.level) : undefined;

  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-7" aria-labelledby="ready-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="ready-title" className="font-display text-2xl font-medium tracking-tight">
            Er jeg klar for {target}?
          </h2>
          <p className="mt-1 font-medium">{verdict}</p>
          {focus && (
            <p className="mt-1 text-sm text-granite">
              Bruk mest tid på {SKILL_NAMES[focus.skill].toLowerCase()} nå.
            </p>
          )}
        </div>
        <div className="flex w-full max-w-56 gap-1" role="img" aria-label={parts.map((p) => `${SKILL_NAMES[p.skill]}: ${STATUS_LABEL[p.status]}`).join(", ")}>
          {parts.map((p) => (
            <span key={p.skill} className={`h-2.5 flex-1 rounded-full ${TONE[p.status].bar}`} />
          ))}
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p) => (
          <li key={p.skill} className="flex flex-col rounded-xl bg-snow p-4 ring-1 ring-ice">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{SKILL_NAMES[p.skill]}</span>
              <Chip status={p.status} />
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-granite">{p.evidence}</p>
            {p.action && (
              <Link href={p.action.href} className="mt-3 text-sm font-medium text-fjord underline-offset-4 hover:underline">
                {p.action.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {requirement && required && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Til søknaden om {requirement.label}</span> er hovedregelen bestått{" "}
            {SKILL_NAMES[requirement.skill].toLowerCase()} prøve på {requirement.level}. Se{" "}
            <a href="https://www.udi.no" target="_blank" rel="noreferrer" className="font-medium text-fjord underline underline-offset-4">
              udi.no
            </a>{" "}
            for unntak.
          </p>
          <span className="flex shrink-0 items-center gap-2 text-sm">
            {SKILL_NAMES[requirement.skill]} {requirement.level}: <Chip status={required.status} />
          </span>
        </div>
      )}
    </section>
  );
}
