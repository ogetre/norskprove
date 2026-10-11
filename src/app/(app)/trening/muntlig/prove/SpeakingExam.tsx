"use client";

import Link from "next/link";
import { useState } from "react";
import { SpeakingSession } from "@/components/speaking/SpeakingSession";
import { SPEAKING_KIND_NAMES, type SpeakingTask } from "@/content/speaking";
import { shuffle } from "@/lib/random";

type Band = { id: string; label: string; tasks: SpeakingTask[] };
type BandPools = { id: string; label: string; pools: SpeakingTask[][] };

export function SpeakingExam({ bands: pools }: { bands: BandPools[] }) {
  // A new prompt per part each visit. Paywall mounts this on the client only, so the draw
  // never has to match a server render.
  const [bands] = useState<Band[]>(() => pools.map(({ pools: parts, ...b }) => ({ ...b, tasks: parts.map((p) => shuffle(p)[0]) })));
  const [band, setBand] = useState<Band | null>(null);

  if (band) {
    return (
      <SpeakingSession
        tasks={band.tasks}
        mode="full"
        fullscreen
        title={`Muntlig prøve ${band.label}`}
        after={
          <Link href="/trening/muntlig" className="inline-flex rounded-md px-5 py-2.5 font-medium text-granite ring-1 ring-ice hover:text-ink">
            Tilbake til muntlig
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Muntlig prøve</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-granite">
        Velg nivå som når du melder deg på prøven. Sensoren stiller spørsmål med stemme, og du svarer i
        mikrofonen. Nettleseren spør om lov til å bruke mikrofonen første gang.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {bands.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setBand(b)}
              className="group flex h-full w-full flex-col rounded-2xl bg-surface p-6 text-left ring-1 ring-ice transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgb(15_43_60/0.55)]"
            >
              <span className="font-display text-3xl font-medium tracking-tight">{b.label}</span>
              <span className="mt-1 text-sm text-granite tabular-nums">
                {b.tasks.length} deler, ca. {Math.round(b.tasks.reduce((n, t) => n + t.prepSeconds + t.questions.length * (t.speakSeconds + 8), 0) / 60)} min
              </span>
              <ol className="mt-4 space-y-1.5 text-sm">
                {b.tasks.map((t, i) => (
                  <li key={t.id}>
                    <span className="text-granite">{i + 1}. {SPEAKING_KIND_NAMES[t.kind]}:</span> {t.title}
                  </li>
                ))}
              </ol>
              <span className="mt-auto pt-6 font-medium text-rorbu">Start prøven</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
