"use client";

import Link from "next/link";
import { useState } from "react";
import { TaskPractice } from "@/components/TaskPractice";
import { LEVELS, SKILL_NAMES, type ExamTask, type Level, type QuestionKind, type Skill } from "@/lib/types";

export function QuickPractice({
  skill,
  kind,
  title,
  tasks,
}: {
  skill: Skill;
  kind: QuestionKind;
  title: string;
  tasks: ExamTask[];
}) {
  const [level, setLevel] = useState<Level | "alle">("alle");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, done: 0 });

  const list = tasks.filter((t) => level === "alle" || t.level === level);
  const task = list[index];
  const finished = index >= list.length;

  return (
    <>
      <nav aria-label="Brødsmuler" className="text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">Trening</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href={`/trening/${skill}`} className="underline-offset-4 hover:text-ink hover:underline">
          {SKILL_NAMES[skill]}
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{title}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-granite">Hurtigøving</p>
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{title}</h1>
        </div>
        <div role="group" aria-label="Velg nivå" className="flex flex-wrap gap-2">
          {(["alle", ...LEVELS] as const).map((l) => {
            const count = l === "alle" ? tasks.length : tasks.filter((t) => t.level === l).length;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                disabled={count === 0}
                onClick={() => {
                  setLevel(l);
                  setIndex(0);
                  setScore({ correct: 0, total: 0, done: 0 });
                }}
                className="rounded-full border border-ice bg-surface px-3.5 py-1.5 text-sm transition-colors hover:border-mist disabled:opacity-35 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-snow"
              >
                {l === "alle" ? "Alle" : l}
              </button>
            );
          })}
        </div>
      </div>

      {!finished && (
        <div className="mt-5 flex items-center gap-3 text-sm text-granite">
          <span className="tabular-nums">
            Oppgave {index + 1} av {list.length}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ice">
            <span className="block h-full rounded-full bg-fjord transition-[width] duration-500" style={{ width: `${(index / list.length) * 100}%` }} />
          </span>
        </div>
      )}

      <div className="mt-8">
        {finished ? (
          <div className="rise mx-auto max-w-xl rounded-2xl bg-surface p-8 text-center ring-1 ring-ice">
            <p className="text-granite">Ferdig med {title.toLowerCase()}</p>
            <p className="mt-2 font-display text-5xl font-medium tabular-nums">
              {score.correct}/{score.total}
            </p>
            <p className="mt-2 text-granite">riktige svar i {score.done} oppgaver</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setScore({ correct: 0, total: 0, done: 0 });
                }}
                className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]"
              >
                Øv en gang til
              </button>
              <Link href={`/trening/${skill}`} className="rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice hover:text-ink">
                Tilbake til {SKILL_NAMES[skill].toLowerCase()}
              </Link>
            </div>
          </div>
        ) : (
          <TaskPractice
            key={`${kind}-${level}-${task.id}`}
            task={task}
            skill={skill}
            mode="quick"
            after={(r) => (
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setScore((s) => ({ correct: s.correct + r.correct, total: s.total + r.total, done: s.done + 1 }));
                  setIndex((i) => i + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
              >
                {index + 1 < list.length ? "Neste oppgave" : "Se resultatet"}
              </button>
            )}
          />
        )}
      </div>
    </>
  );
}
