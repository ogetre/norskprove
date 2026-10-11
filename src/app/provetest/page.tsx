import type { Metadata } from "next";
import Link from "next/link";
import { SkillIcon, SKILLS } from "@/components/SkillIcon";
import { SKILL_NAMES } from "@/lib/types";

export const metadata: Metadata = { title: "Gratis prøvetest" };

export default function TrialMenuPage() {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="rise font-display text-4xl font-medium tracking-tight sm:text-5xl">Ta en gratis prøvetest</h1>
        <p className="rise mt-4 text-lg leading-relaxed text-granite" style={{ animationDelay: "100ms" }}>
          Velg en del av Norskprøven. Testen tar noen minutter, og du får et foreløpig nivå
          med en gang. Du trenger ikke konto.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {SKILLS.map((s, i) => {
          const body = (
            <>
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl ${s.ready ? "bg-tile text-white" : "bg-ice text-mist"}`}>
                <SkillIcon skill={s.skill} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xl font-semibold">{SKILL_NAMES[s.skill]}</span>
                  <span className="text-sm text-granite tabular-nums">{s.trialMinutes} min</span>
                </span>
                <span className="block text-sm text-rorbu">{s.official}</span>
                <span className="mt-2 block leading-relaxed text-granite">{s.blurb}</span>
                <span className={`mt-4 inline-flex text-sm font-medium ${s.ready ? "text-rorbu" : "text-mist"}`}>
                  {s.ready ? "Start testen" : "Kommer snart"}
                </span>
              </span>
            </>
          );
          return (
            <li key={s.skill} className="rise" style={{ animationDelay: `${150 + i * 90}ms` }}>
              {s.ready ? (
                <Link
                  href={`/provetest/${s.skill}`}
                  className="flex h-full gap-5 rounded-2xl bg-surface p-6 ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgb(15_43_60/0.55)]"
                >
                  {body}
                </Link>
              ) : (
                <div aria-disabled="true" className="flex h-full gap-5 rounded-2xl bg-white/60 p-6 ring-1 ring-ice">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
