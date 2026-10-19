"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { KINDS, PART_NAMES, partLabel, type Band, type ExamResult, type Route } from "@/lib/exam-parts";
import { totals, type Answer } from "@/lib/scoring";
import type { ExamTask } from "@/lib/types";
import { Questions } from "../Questions";
import { Stimulus } from "../Stimulus";

/*
 * The screens the reading and listening tests share: the page before each part, the result with
 * the way through the test, and the review of every part.
 */

export function Confirm({
  title,
  text,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="rise w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 id="confirm-title" className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 leading-relaxed text-granite">{text}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2.5 font-medium text-granite hover:text-ink">
            Avbryt
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-md bg-rorbu px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#a03022]"
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The page before a part: what it is and how it works, with the button that starts it below. */
export function BriefingSlide({ part, title, points, children }: { part: number; title: string; points: string[]; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-fjord-deep px-4 py-10 text-snow">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="aurora" />
      </div>
      <section className="rise relative w-full max-w-xl" aria-labelledby="briefing-title">
        <p className="text-sm text-mist">Del {part + 1} av 3</p>
        <h1 id="briefing-title" className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          {title}
        </h1>
        <ul className="mt-7 space-y-3 text-lg leading-relaxed text-ice">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-[#7fe0b8]" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-9 flex flex-wrap items-center gap-4">{children}</div>
      </section>
    </div>
  );
}

export function ExamResultScreen({
  title,
  result,
  parts,
  answers,
  route,
  band,
  backHref,
  onReview,
  onRestart,
}: {
  title: string;
  result: ExamResult;
  parts: ExamTask[][];
  answers: Answer[][][];
  route: Route | null;
  band: Band | null;
  backHref: string;
  onReview: () => void;
  onRestart: () => void;
}) {
  const label = result.level === "under A1" ? "Under A1" : result.level;
  const rows = parts.map((p, i) => ({
    name: partLabel(KINDS[i], route, band),
    ...totals(
      p.flatMap((x) => x.questions),
      answers[i].flat(),
    ),
  }));
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rise relative overflow-hidden rounded-2xl bg-fjord-deep p-8 text-snow sm:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora" />
        </div>
        <div className="relative">
          <p className="text-mist">{title}</p>
          <p className="mt-3 font-display text-6xl font-medium tracking-tight sm:text-7xl">{label}</p>
          <p className="mt-3 text-lg text-ice">
            {result.correct} av {result.total} poeng ({Math.round((result.correct / Math.max(1, result.total)) * 100)} %)
          </p>
        </div>
      </div>
      <section className="mt-6 rounded-2xl bg-surface p-6 ring-1 ring-ice" aria-labelledby="path-title">
        <h2 id="path-title" className="font-semibold">
          Veien gjennom prøven
        </h2>
        <ol className="mt-4 divide-y divide-ice">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-4 py-3">
              <span>{r.name}</span>
              <span className="font-semibold tabular-nums">
                {r.correct} av {r.total}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm leading-relaxed text-granite">
          Nivået er det høyeste nivået der du fikk minst 60 % riktig. Som på prøven er det oppgavene i hovedprøven som avgjør mest.
        </p>
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onReview} className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
          Se gjennomgang
        </button>
        <button type="button" onClick={onRestart} className="rounded-md px-5 py-2.5 font-medium text-ink ring-1 ring-ice hover:bg-ice">
          Ta en ny prøve
        </button>
        <Link href={backHref} className="rounded-md px-5 py-2.5 font-medium text-granite hover:text-ink">
          Tilbake
        </Link>
      </div>
    </div>
  );
}

/** Every part with its texts, the answers given and the right answers. `about` says what to note on a task. */
export function ExamReview({
  parts,
  answers,
  about,
  onBack,
}: {
  parts: ExamTask[][];
  answers: Answer[][][];
  about: (task: ExamTask) => string;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <button type="button" onClick={onBack} className="text-sm text-granite underline-offset-4 hover:text-ink hover:underline">
        Tilbake til resultatet
      </button>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Gjennomgang</h1>
      {parts.map((p, pi) => {
        let n = 1;
        return (
          <section key={pi} className="mt-10" aria-label={PART_NAMES[KINDS[pi]]}>
            <h2 className="text-xl font-semibold">{PART_NAMES[KINDS[pi]]}</h2>
            <ol className="mt-6 space-y-12">
              {p.map((t, ti) => {
                const start = n;
                n += t.questions.length;
                return (
                  <li key={t.id} className="grid gap-8 lg:grid-cols-2">
                    <div>
                      <p className="text-sm text-granite">{about(t)}</p>
                      <h3 className="mt-1 text-lg font-semibold">{t.title}</h3>
                      <div className="mt-4">
                        <Stimulus task={t} mode="review" />
                      </div>
                    </div>
                    <Questions questions={t.questions} answers={answers[pi][ti]} submitted onAnswer={() => {}} start={start} />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** JSON turns unanswered blanks into null; the answer checks expect undefined. */
export function reviveAnswers(answers: unknown[][][]): Answer[][][] {
  return answers.map((part) =>
    part.map((row) => row.map((a) => (a === null ? undefined : Array.isArray(a) ? a.map((v) => v ?? undefined) : a))),
  ) as Answer[][][];
}
