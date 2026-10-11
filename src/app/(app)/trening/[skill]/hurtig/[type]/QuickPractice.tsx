"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelFilter, levelCounts, type LevelChoice } from "@/components/LevelFilter";
import { TaskPractice } from "@/components/TaskPractice";
import { estimateLevel } from "@/lib/levels";
import { shuffle } from "@/lib/random";
import { useAppState } from "@/lib/store";
import { SKILL_NAMES, type ExamTask, type QuestionKind, type Skill } from "@/lib/types";

const ROUND = 8;

/** A short round at the chosen level: random tasks, the ones not solved yet first. */
function pickRound(tasks: ExamTask[], level: LevelChoice, solved: Set<string>): ExamTask[] {
  const list = tasks.filter((t) => level === "alle" || t.level === level);
  const fresh = list.filter((t) => !solved.has(t.id));
  const seen = list.filter((t) => solved.has(t.id));
  return [...shuffle(fresh), ...shuffle(seen)].slice(0, ROUND);
}

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
  const state = useAppState();
  const solved = new Set(state.attempts.filter((a) => a.skill === skill).map((a) => a.taskId));
  const counts = levelCounts(tasks);
  // Start at the learner's estimated level when there is one. This component only mounts
  // on the client (inside Paywall), so the random round never has to match a server render.
  const [level, setLevel] = useState<LevelChoice>(() => {
    const l = estimateLevel(state, skill);
    return l && counts[l] > 0 ? l : "alle";
  });
  const [round, setRound] = useState(() => pickRound(tasks, level, solved));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, done: 0 });

  const task = round[index];
  const finished = index >= round.length;
  const atLevel = tasks.filter((t) => level === "alle" || t.level === level);
  const solvedAtLevel = atLevel.filter((t) => solved.has(t.id)).length;

  const newRound = (l: LevelChoice) => {
    setLevel(l);
    setRound(pickRound(tasks, l, solved));
    setIndex(0);
    setScore({ correct: 0, total: 0, done: 0 });
  };

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
        <LevelFilter value={level} onChange={newRound} counts={counts} />
      </div>

      {!finished && (
        <div className="mt-5 flex items-center gap-3 text-sm text-granite">
          <span className="tabular-nums">
            Oppgave {index + 1} av {round.length}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ice">
            <span className="block h-full rounded-full bg-fjord transition-[width] duration-500" style={{ width: `${(index / round.length) * 100}%` }} />
          </span>
          <span className="hidden tabular-nums sm:inline">
            {solvedAtLevel} av {atLevel.length} løst
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
            <p className="mt-1 text-sm text-granite tabular-nums">
              Du har løst {solvedAtLevel} av {atLevel.length} oppgaver {level === "alle" ? "totalt" : `på ${level}`}.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => newRound(level)}
                className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white hover:bg-[#a03022]"
              >
                Ny runde
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
                {index + 1 < round.length ? "Neste oppgave" : "Se resultatet"}
              </button>
            )}
          />
        )}
      </div>
    </>
  );
}
