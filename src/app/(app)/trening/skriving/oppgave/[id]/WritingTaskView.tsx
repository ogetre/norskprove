"use client";

import Link from "next/link";
import { useState } from "react";
import { WritingPractice } from "@/components/writing/WritingPractice";
import type { WritingTask } from "@/content/writing";

export function WritingTaskView({ task, next }: { task: WritingTask; next: { id: string; title: string } }) {
  const [timed, setTimed] = useState(false);
  const [round, setRound] = useState(0);

  return (
    <>
      <nav aria-label="Brødsmuler" className="text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">Trening</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href="/trening/skriving" className="underline-offset-4 hover:text-ink hover:underline">Skriving</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{task.title}</span>
      </nav>

      <div className="mt-5 mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{task.title}</h1>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-granite">
          <input
            type="checkbox"
            checked={timed}
            onChange={() => {
              setTimed((t) => !t);
              setRound((r) => r + 1);
            }}
            className="size-4 accent-[var(--fjord)]"
          />
          Øv med tidtaker ({task.minutes} min)
        </label>
      </div>

      <WritingPractice
        key={`${task.id}-${round}`}
        task={task}
        mode="quick"
        timed={timed}
        after={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/trening/skriving/oppgave/${next.id}`}
              className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
            >
              Neste: {next.title}
            </Link>
            <button
              type="button"
              onClick={() => setRound((r) => r + 1)}
              className="rounded-md px-5 py-2.5 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice"
            >
              Skriv på nytt
            </button>
          </div>
        }
      />
    </>
  );
}
