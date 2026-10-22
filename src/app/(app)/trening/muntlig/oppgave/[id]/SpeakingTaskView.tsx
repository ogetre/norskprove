"use client";

import Link from "next/link";
import { useState } from "react";
import { ReportProblem } from "@/components/ReportProblem";
import { SpeakingSession } from "@/components/speaking/SpeakingSession";
import type { SpeakingTask } from "@/content/speaking";

export function SpeakingTaskView({ task, next }: { task: SpeakingTask; next: { id: string; title: string } }) {
  const [round, setRound] = useState(0);
  return (
    <>
      <nav aria-label="Brødsmuler" className="mb-8 text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">Trening</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link href="/trening/muntlig" className="underline-offset-4 hover:text-ink hover:underline">Muntlig</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>{task.title}</span>
      </nav>
      <SpeakingSession
        key={`${task.id}-${round}`}
        tasks={[task]}
        mode="quick"
        title={task.title}
        after={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/trening/muntlig/oppgave/${next.id}`}
              className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
            >
              Neste: {next.title}
            </Link>
            <button
              type="button"
              onClick={() => setRound((r) => r + 1)}
              className="rounded-md px-5 py-2.5 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice"
            >
              Øv en gang til
            </button>
          </div>
        }
      />
      <ReportProblem taskId={task.id} />
    </>
  );
}
