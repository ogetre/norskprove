"use client";

import { useState } from "react";
import type { WritingTask } from "@/content/writing";
import type { LocatedError } from "@/lib/error-spans";
import { topicName } from "@/lib/feedback-topics";
import { textLang } from "@/lib/languages";
import { saveRevision, useAppState } from "@/lib/store";
import type { WritingRecheck } from "@/lib/types";

/**
 * The learner corrects the marked errors in their own text, with the corrections hidden,
 * and AI checks which are fixed. The last attempt is saved with the text.
 */
export function FixYourself({
  task,
  text,
  errors,
  submissionId,
  explanationLang,
  onClose,
}: {
  task: WritingTask;
  text: string;
  errors: LocatedError[];
  submissionId?: string;
  explanationLang?: string;
  onClose: () => void;
}) {
  const saved = useAppState().writing.find((w) => w.id === submissionId)?.revision;
  const [draft, setDraft] = useState(saved?.text ?? text);
  const [check, setCheck] = useState<WritingRecheck | null>(saved?.check ?? null);
  const [shownFix, setShownFix] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultFor = (n: number) => check?.results.find((r) => r.index === n);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/writing-recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          original: text,
          revised: draft,
          errors: errors.map(({ original, correction, explanation }) => ({ original, correction, explanation })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { check?: WritingRecheck; error?: string } | null;
      if (!res.ok || !data?.check) throw new Error(data?.error ?? "Noe gikk galt. Prøv igjen.");
      setCheck(data.check);
      if (submissionId) saveRevision(submissionId, { text: draft, at: new Date().toISOString(), check: data.check });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt. Prøv igjen.");
    } finally {
      setBusy(false);
    }
  };

  const fixed = check ? check.results.filter((r) => r.fixed).length : 0;
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-7" aria-labelledby="fix-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="fix-title" className="text-xl font-semibold">
          Rett feilene selv
        </h2>
        <button type="button" onClick={onClose} className="text-sm font-medium text-granite underline-offset-4 hover:text-ink hover:underline">
          Vis løsningene i stedet
        </button>
      </div>
      <p className="mt-1 text-sm text-granite">
        Rett teksten din ut fra forklaringene. Løsningen er skjult, men du kan se den for én feil om gangen.
      </p>

      {check && (
        <div className="mt-5 rounded-xl bg-snow p-4" aria-live="polite">
          <p className="font-semibold">
            {fixed} av {errors.length} feil er rettet
            {check.new_errors.length ? `, ${check.new_errors.length} ${check.new_errors.length === 1 ? "ny" : "nye"} feil` : ""}
          </p>
          <p {...textLang(explanationLang)} className="mt-1 text-sm leading-relaxed text-granite">
            {check.summary}
          </p>
        </div>
      )}

      <ol className="mt-5 space-y-2.5">
        {errors.map((e) => {
          const r = resultFor(e.n);
          return (
            <li key={e.n} className="flex gap-3 rounded-xl p-3.5 ring-1 ring-ice">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${
                  r?.fixed ? "bg-moss/15 text-moss" : r ? "bg-rorbu/10 text-rorbu" : "bg-ice text-fjord"
                }`}
                aria-label={r ? (r.fixed ? "Rettet" : "Ikke rettet ennå") : undefined}
              >
                {r?.fixed ? "✓" : e.n}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="font-medium">«{e.original}»</span>
                    {shownFix.has(e.n) && <span className="ml-2 font-semibold text-moss">→ {e.correction}</span>}
                  </p>
                  <span className="rounded-md bg-tint px-2 py-0.5 text-xs font-medium text-granite">{topicName(e.topic)}</span>
                </div>
                <p {...textLang(explanationLang)} className="mt-1 text-sm leading-relaxed text-granite">
                  {r ? r.comment : e.explanation}
                </p>
                {!shownFix.has(e.n) && !r?.fixed && (
                  <button
                    type="button"
                    onClick={() => setShownFix((s) => new Set(s).add(e.n))}
                    className="mt-1 text-xs font-medium text-fjord underline-offset-4 hover:underline"
                  >
                    Vis løsning
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {check && check.new_errors.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold">Nye feil i rettingen</h3>
          <ul className="mt-2 space-y-2">
            {check.new_errors.map((e, i) => (
              <li key={i} className="rounded-xl bg-rorbu/5 p-3.5 text-sm ring-1 ring-rorbu/20">
                <span className="text-rorbu line-through decoration-rorbu/50">{e.original}</span>
                <span aria-hidden="true" className="mx-2 text-granite">
                  →
                </span>
                <span className="font-semibold text-moss">{e.correction}</span>
                <p {...textLang(explanationLang)} className="mt-1 text-granite">
                  {e.explanation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label htmlFor="fix-text" className="mt-6 block font-semibold">
        Teksten din
      </label>
      <textarea
        id="fix-text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="mt-2 block min-h-[260px] w-full resize-y rounded-xl border-2 border-ice bg-surface p-4 text-[16px] leading-relaxed focus:border-fjord focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-rorbu">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || draft.trim() === text.trim()}
          onClick={() => void submit()}
          className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Sjekker rettingene …" : check ? "Sjekk igjen" : "Sjekk rettingene"}
        </button>
        {draft !== text && !busy && (
          <button type="button" onClick={() => setDraft(text)} className="text-sm font-medium text-granite hover:text-ink">
            Start på nytt
          </button>
        )}
      </div>
    </section>
  );
}
