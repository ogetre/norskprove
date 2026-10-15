"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { WritingFeedback } from "@/components/writing/WritingFeedback";
import { WritingPractice } from "@/components/writing/WritingPractice";
import type { WritingTask } from "@/content/writing";
import { useAppState, useHydrated } from "@/lib/store";
import { checkWriting } from "@/lib/writing-checks";

/** A text handed in earlier, with its checks and saved AI feedback. */
function SavedText({ task, id }: { task: WritingTask; id: string }) {
  const state = useAppState();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;

  const sub = state.writing.find((w) => w.id === id && w.promptId === task.id);
  if (!sub) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center ring-1 ring-ice">
        <p className="text-lg font-semibold">Fant ikke teksten</p>
        <p className="mx-auto mt-2 max-w-md text-granite">
          Den kan være levert på en annen enhet og ikke synkronisert ennå. Prøv igjen om litt, eller skriv oppgaven på nytt.
        </p>
        <Link
          href={`/trening/skriving/oppgave/${task.id}`}
          className="mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord"
        >
          Skriv oppgaven
        </Link>
      </div>
    );
  }

  const checks = checkWriting(task, sub.text);
  const passed = checks.filter((c) => c.ok).length;
  const d = new Date(sub.at);
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-fjord-deep p-7 text-snow sm:p-9">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora" />
        </div>
        <div className="relative">
          <p className="text-mist">
            Levert {d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })} kl.{" "}
            {d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {passed} av {checks.length} krav
          </p>
          <p className="mt-2 text-ice">
            {sub.words} ord{sub.feedback ? `. AI-sensoren vurderte teksten til ${sub.feedback.level_estimate}.` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/trening/skriving/oppgave/${task.id}`}
          className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
        >
          Skriv oppgaven på nytt
        </Link>
        <Link
          href="/trening/skriving#history-title"
          className="rounded-md px-5 py-2.5 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice"
        >
          Alle tekstene dine
        </Link>
      </div>
      <WritingFeedback task={task} text={sub.text} checks={checks} submissionId={sub.id} />
    </div>
  );
}

export function WritingTaskView({ task, next }: { task: WritingTask; next: { id: string; title: string } }) {
  const savedId = useSearchParams().get("tekst");
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
        {!savedId && (
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
        )}
      </div>

      {savedId ? (
        <SavedText key={savedId} task={task} id={savedId} />
      ) : (
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
      )}
    </>
  );
}
