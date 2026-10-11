"use client";

import Link from "next/link";
import { TaskPractice } from "@/components/TaskPractice";
import { SKILL_NAMES, type ExamTask, type Skill } from "@/lib/types";

export function SingleTask({ skill, task, next }: { skill: Skill; task: ExamTask; next: { id: string; title: string } }) {
  return (
    <>
      <nav aria-label="Brødsmuler" className="mb-6 text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">Trening</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href={`/trening/${skill}`} className="underline-offset-4 hover:text-ink hover:underline">
          {SKILL_NAMES[skill]}
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{task.title}</span>
      </nav>
      <TaskPractice
        key={task.id}
        task={task}
        skill={skill}
        mode="text"
        after={(_, retry) => (
          <>
            <Link
              href={`/trening/${skill}/oppgave/${next.id}`}
              className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
            >
              Neste: {next.title}
            </Link>
            <button
              type="button"
              onClick={retry}
              className="rounded-md px-5 py-2.5 font-medium text-snow ring-1 ring-white/25 transition-colors hover:bg-white/10"
            >
              Prøv igjen
            </button>
          </>
        )}
      />
    </>
  );
}
