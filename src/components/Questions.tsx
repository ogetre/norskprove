"use client";

import { maxPoints, score, type Answer } from "@/lib/scoring";
import type { Question } from "@/lib/types";

export type { Answer };

const LETTERS = "ABCDEFGH";

type Props = {
  questions: Question[];
  answers: Answer[];
  /** Show right/wrong marks and explanations. */
  submitted: boolean;
  onAnswer: (index: number, value: Answer) => void;
  /** Number shown for the first question (useful when questions span several tasks). */
  start?: number;
};

function Feedback({ q, a }: { q: Question; a: Answer }) {
  const got = score(q, a);
  const max = maxPoints(q);
  const right = got === max;
  return (
    <p
      className={`mt-3 rounded-lg px-4 py-3 text-sm leading-relaxed ${right ? "bg-moss/10 text-moss" : "bg-rorbu/10 text-rorbu"}`}
    >
      <span className="font-semibold">
        {right ? "Riktig. " : max > 1 ? `${got} av ${max} riktige. ` : a === undefined ? "Ikke besvart. " : "Feil. "}
      </span>
      {q.explanation}
    </p>
  );
}

function Option({
  label,
  chosen,
  state,
  disabled,
  name,
  onChange,
}: {
  label: string;
  chosen: boolean;
  state: string;
  disabled: boolean;
  name: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border-2 bg-surface px-4 py-3 transition-[border-color,background-color,opacity] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rorbu ${disabled ? "cursor-default" : "cursor-pointer"} ${state}`}
    >
      <input type="radio" name={name} className="sr-only" checked={chosen} disabled={disabled} onChange={onChange} />
      <span
        aria-hidden="true"
        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${chosen ? "border-fjord" : "border-mist"}`}
      >
        {chosen && <span className="size-2.5 rounded-full bg-fjord" />}
      </span>
      {label}
    </label>
  );
}

function SingleChoice({ q, a, submitted, name, onAnswer }: { q: Extract<Question, { kind: "choice" | "truefalse" }>; a: Answer; submitted: boolean; name: string; onAnswer: (v: Answer) => void }) {
  const options =
    q.kind === "choice"
      ? q.options.map((label, i) => ({ label, value: i as number | boolean }))
      : [
          { label: "Riktig", value: true },
          { label: "Galt", value: false },
        ];
  return (
    <div className={`mt-3 grid gap-2 ${q.kind === "truefalse" ? "grid-cols-2" : ""}`}>
      {options.map((o) => {
        const chosen = a === o.value;
        let state = chosen ? "border-fjord bg-fjord/5" : "border-ice hover:border-mist";
        if (submitted) {
          state =
            o.value === q.answer ? "border-moss bg-moss/10" : chosen ? "border-rorbu bg-rorbu/10" : "border-ice opacity-55";
        }
        return (
          <Option
            key={String(o.value)}
            label={o.label}
            chosen={chosen}
            state={state}
            disabled={submitted}
            name={name}
            onChange={() => onAnswer(o.value)}
          />
        );
      })}
    </div>
  );
}

const selectBase =
  "rounded-md border-2 bg-surface px-2 py-1.5 font-medium focus:border-fjord focus:outline-none disabled:opacity-100";

function Match({ q, a, submitted, onAnswer }: { q: Extract<Question, { kind: "match" }>; a: Answer; submitted: boolean; onAnswer: (v: Answer) => void }) {
  const picks = (Array.isArray(a) ? a : q.left.map(() => undefined)) as (number | undefined)[];
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <ol className="space-y-2 rounded-lg bg-snow p-4 text-[15px] leading-relaxed">
        {q.right.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-display text-sm font-medium text-fjord">{LETTERS[i]}</span>
            <span>{r}</span>
          </li>
        ))}
      </ol>
      <ul className="space-y-3">
        {q.left.map((l, i) => {
          const right = picks[i] === q.answer[i];
          return (
            <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-ice bg-surface px-4 py-3">
              <span className="text-[15px] leading-snug">{l}</span>
              <span className="flex shrink-0 items-center gap-2">
                <select
                  aria-label={`Velg bokstav for: ${l}`}
                  value={picks[i] ?? ""}
                  disabled={submitted}
                  onChange={(e) => {
                    const next = [...picks];
                    next[i] = e.target.value === "" ? undefined : Number(e.target.value);
                    onAnswer(next);
                  }}
                  className={`${selectBase} ${submitted ? (right ? "border-moss text-moss" : "border-rorbu text-rorbu") : "border-ice"}`}
                >
                  <option value="">–</option>
                  {q.right.map((_, j) => (
                    <option key={j} value={j}>
                      {LETTERS[j]}
                    </option>
                  ))}
                </select>
                {submitted && !right && (
                  <span className="text-sm font-semibold text-moss" aria-label={`Riktig svar: ${LETTERS[q.answer[i]]}`}>
                    {LETTERS[q.answer[i]]}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Order({ q, a, submitted, onAnswer }: { q: Extract<Question, { kind: "order" }>; a: Answer; submitted: boolean; onAnswer: (v: Answer) => void }) {
  const order = (Array.isArray(a) ? a : q.items.map((_, i) => i)) as number[];
  const move = (pos: number, dir: -1 | 1) => {
    const next = [...order];
    [next[pos], next[pos + dir]] = [next[pos + dir], next[pos]];
    onAnswer(next);
  };
  return (
    <ol className="mt-3 space-y-2">
      {order.map((item, pos) => {
        const right = item === pos;
        return (
          <li
            key={item}
            className={`flex items-center gap-3 rounded-lg border-2 bg-surface px-3 py-2.5 ${submitted ? (right ? "border-moss bg-moss/10" : "border-rorbu bg-rorbu/10") : "border-ice"}`}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ice font-display text-sm font-medium text-fjord tabular-nums">
              {pos + 1}
            </span>
            <span className="flex-1 text-[15px] leading-snug">{q.items[item]}</span>
            {submitted ? (
              !right && <span className="shrink-0 text-xs font-medium text-moss">Skal være nr. {item + 1}</span>
            ) : (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={pos === 0}
                  onClick={() => move(pos, -1)}
                  aria-label={`Flytt «${q.items[item]}» opp`}
                  className="grid size-8 place-items-center rounded-md text-granite ring-1 ring-ice transition-colors hover:bg-ice hover:text-ink disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pos === order.length - 1}
                  onClick={() => move(pos, 1)}
                  aria-label={`Flytt «${q.items[item]}» ned`}
                  className="grid size-8 place-items-center rounded-md text-granite ring-1 ring-ice transition-colors hover:bg-ice hover:text-ink disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Gap({ q, a, submitted, onAnswer }: { q: Extract<Question, { kind: "gap" }>; a: Answer; submitted: boolean; onAnswer: (v: Answer) => void }) {
  const blanks = q.segments.filter((s) => typeof s !== "string").length;
  const picks = (Array.isArray(a) ? a : Array.from({ length: blanks }, () => undefined)) as (number | undefined)[];
  // Index of each blank among the blanks, by segment position.
  const blankAt = q.segments.map((_, i) => q.segments.slice(0, i).filter((x) => typeof x !== "string").length);
  return (
    <p className="mt-3 rounded-lg bg-surface p-4 text-[17px] leading-[2.4] ring-1 ring-ice">
      {q.segments.map((s, i) => {
        if (typeof s === "string") return <span key={i}>{s}</span>;
        const bi = blankAt[i];
        const right = picks[bi] === s.answer;
        return (
          <span key={i} className="inline-flex items-center gap-1 align-middle">
            <select
              aria-label={`Hull ${bi + 1}`}
              value={picks[bi] ?? ""}
              disabled={submitted}
              onChange={(e) => {
                const next = [...picks];
                next[bi] = e.target.value === "" ? undefined : Number(e.target.value);
                onAnswer(next);
              }}
              className={`${selectBase} text-[15px] ${submitted ? (right ? "border-moss text-moss" : "border-rorbu text-rorbu") : "border-ice"}`}
            >
              <option value="">velg …</option>
              {s.options.map((o, j) => (
                <option key={j} value={j}>
                  {o}
                </option>
              ))}
            </select>
            {submitted && !right && <span className="text-sm font-semibold text-moss">{s.options[s.answer]}</span>}
          </span>
        );
      })}
    </p>
  );
}

export function Questions({ questions, answers, submitted, onAnswer, start = 1 }: Props) {
  return (
    <ol className="space-y-9">
      {questions.map((q, qi) => {
        const a = answers[qi];
        const set = (v: Answer) => onAnswer(qi, v);
        return (
          <li key={qi}>
            <fieldset>
              <legend className="flex gap-3 font-semibold">
                <span className="text-granite tabular-nums">{start + qi}.</span>
                <span>
                  {q.prompt}
                  {q.kind === "truefalse" && (
                    <span className="block text-sm font-normal text-granite">Riktig eller galt?</span>
                  )}
                </span>
              </legend>
              {(q.kind === "choice" || q.kind === "truefalse") && (
                <SingleChoice q={q} a={a} submitted={submitted} name={`q${start + qi}`} onAnswer={set} />
              )}
              {q.kind === "match" && <Match q={q} a={a} submitted={submitted} onAnswer={set} />}
              {q.kind === "order" && <Order q={q} a={a} submitted={submitted} onAnswer={set} />}
              {q.kind === "gap" && <Gap q={q} a={a} submitted={submitted} onAnswer={set} />}
              {submitted && <Feedback q={q} a={a} />}
            </fieldset>
          </li>
        );
      })}
    </ol>
  );
}
