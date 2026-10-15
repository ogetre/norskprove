"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLanguage, isRtl } from "@/lib/languages";
import { GRADES, inDays, reviewQueue, schedule, type Grade } from "@/lib/srs";
import { dayKey, removeWord, reviewCard, useAppState, useHydrated } from "@/lib/store";
import { speak } from "@/lib/tts";
import type { SavedWord } from "@/lib/types";

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000);
}

function Translation({ word, className = "" }: { word: SavedWord; className?: string }) {
  const rtl = isLanguage(word.lang) && isRtl(word.lang);
  return (
    <span lang={word.lang} dir={rtl ? "rtl" : "ltr"} className={className}>
      {word.translation}
    </span>
  );
}

/** One review round: the words due today and a few new ones, one card at a time. */
function Review({ onDone }: { onDone: () => void }) {
  const state = useAppState();
  const words = state.words ?? [];
  const today = dayKey();
  const [queue, setQueue] = useState(() => reviewQueue(words, state.srs, today).map((w) => w.id));
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const word = words.find((w) => w.id === queue[0]);

  const answer = (grade: Grade) => {
    if (!word) return;
    reviewCard(word.id, schedule(state.srs[word.id], grade, today));
    setShown(false);
    // A word you did not know comes back at the end of this round.
    setQueue(([first, ...rest]) => (grade === "again" ? [...rest, first] : rest));
    if (grade !== "again") setDone((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) answer(g.grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!word) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center ring-1 ring-ice">
        <p className="font-display text-2xl font-medium tracking-tight">Ferdig for i dag!</p>
        <p className="mt-2 text-granite">{done ? `Du repeterte ${done} ord.` : "Du har ingen ord å repetere akkurat nå."}</p>
        <button type="button" onClick={onDone} className="mt-5 rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
          Se alle ordene
        </button>
      </div>
    );
  }

  const prev = state.srs[word.id];
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm text-granite tabular-nums">
        {done} ferdig, {queue.length} igjen
      </p>
      <div className="mt-3 rounded-2xl bg-surface p-7 text-center ring-1 ring-ice sm:p-9">
        <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-granite">{word.pos}</span>
        <p className="mt-4 flex items-center justify-center gap-3 font-display text-4xl font-medium tracking-tight">
          {word.lemma}
          <button
            type="button"
            onClick={() => void speak(word.lemma.replace(/^(å|en|ei|et) /, ""), { rate: 0.85 })}
            aria-label={`Hør «${word.lemma}»`}
            className="grid size-9 place-items-center rounded-full text-fjord ring-1 ring-ice hover:bg-ice"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
              <path d="M13 7a4 4 0 010 6M15.5 4.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </p>
        {word.example && <p className="mt-4 text-granite italic">{word.example}</p>}

        {shown ? (
          <div className="rise mt-6 border-t border-ice pt-6">
            <Translation word={word} className="block text-2xl font-semibold" />
            {word.example_translation && (
              <p lang={word.lang} className="mt-2 text-sm text-granite italic">
                {word.example_translation}
              </p>
            )}
            {word.forms.length > 0 && (
              <p className="mt-4 text-sm text-granite">{word.forms.map((f) => f.value).join(" · ")}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            autoFocus
            onClick={() => setShown(true)}
            className="mt-8 rounded-md bg-ink px-6 py-3 font-medium text-snow transition-colors hover:bg-fjord"
          >
            Vis svaret
          </button>
        )}
      </div>

      {shown && (
        <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Hvor godt kunne du ordet?">
          {GRADES.map(({ grade, label, key }) => {
            const next = schedule(prev, grade, dayKey());
            return (
              <button
                key={grade}
                type="button"
                onClick={() => answer(grade)}
                className={`flex flex-col items-center rounded-xl px-2 py-3 ring-1 transition-colors ${
                  grade === "again" ? "bg-rorbu/10 text-rorbu ring-rorbu/30 hover:bg-rorbu/15" : "bg-surface ring-ice hover:bg-ice"
                }`}
              >
                <span className="font-semibold">{label}</span>
                <span className="text-xs text-granite">{grade === "again" ? "nå" : inDays(next.interval)}</span>
                <span className="sr-only">Tast {key}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-center text-xs text-granite">Mellomrom viser svaret, tastene 1–4 svarer.</p>
    </div>
  );
}

export function WordsView() {
  const state = useAppState();
  const hydrated = useHydrated();
  const [reviewing, setReviewing] = useState(false);
  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;

  const words = state.words ?? [];
  const today = dayKey();
  const queue = reviewQueue(words, state.srs, today);

  return (
    <>
      <nav aria-label="Brødsmuler" className="text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">
          Trening
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Mine ord</span>
      </nav>
      <h1 className="mt-5 font-display text-3xl font-medium tracking-tight sm:text-4xl">Mine ord</h1>
      <p className="mt-2 max-w-2xl text-granite">
        Ordene du lagrer fra tekstene og opptakene. Repeter litt hver dag, så kommer ordene tilbake akkurat når du er i ferd
        med å glemme dem.
      </p>

      {reviewing ? (
        <div className="mt-8">
          <Review key="review" onDone={() => setReviewing(false)} />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-fjord-deep p-6 text-snow sm:p-7">
            <div>
              <p className="font-display text-2xl font-medium tracking-tight">
                {queue.length ? `${queue.length} ord å repetere i dag` : "Ingen ord å repetere i dag"}
              </p>
              <p className="mt-1 text-mist">
                {words.length ? `${words.length} ord lagret.` : "Trykk på et ord i en tekst og velg «Lagre ordet»."}
              </p>
            </div>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => setReviewing(true)}
                className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
              >
                Start repetisjonen
              </button>
            )}
          </div>

          {words.length === 0 ? (
            <Link
              href="/trening/lesing"
              className="mt-6 inline-flex rounded-md px-5 py-2.5 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice"
            >
              Finn en tekst å lese
            </Link>
          ) : (
            <ul className="mt-6 grid gap-2 md:grid-cols-2">
              {words.map((w) => {
                const s = state.srs[w.id];
                return (
                  <li key={w.id} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-ice">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{w.lemma}</span>
                      <Translation word={w} className="block truncate text-sm text-granite" />
                    </span>
                    <span className="shrink-0 text-xs text-granite">
                      {s ? `Neste: ${inDays(daysBetween(today, s.due))}` : "Ny"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWord(w.id)}
                      aria-label={`Fjern «${w.lemma}»`}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-granite hover:bg-ice hover:text-ink"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
