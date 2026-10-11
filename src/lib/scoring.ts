import type { Question } from "./types";

export type Answer = number | boolean | (number | undefined)[] | undefined;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Deterministic shuffle (same on server and client) where no item keeps its
 * place, so an untouched answer scores nothing (Sattolo's algorithm).
 */
export function shuffledOrder(items: string[]): number[] {
  const idx = items.map((_, i) => i);
  let seed = hash(items.join("|"));
  for (let i = idx.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % i;
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function initialAnswer(q: Question): Answer {
  if (q.kind === "order") return shuffledOrder(q.items);
  if (q.kind === "match") return q.left.map(() => undefined);
  if (q.kind === "gap") return q.segments.filter((s) => typeof s !== "string").map(() => undefined);
  return undefined;
}

export function maxPoints(q: Question): number {
  switch (q.kind) {
    case "match":
      return q.left.length;
    case "order":
      return q.items.length;
    case "gap":
      return q.segments.filter((s) => typeof s !== "string").length;
    default:
      return 1;
  }
}

export function score(q: Question, a: Answer): number {
  switch (q.kind) {
    case "choice":
    case "truefalse":
      return a === q.answer ? 1 : 0;
    case "match":
      return Array.isArray(a) ? q.answer.filter((v, i) => a[i] === v).length : 0;
    case "order":
      return Array.isArray(a) ? a.filter((v, i) => v === i).length : 0;
    case "gap": {
      const blanks = q.segments.filter((s) => typeof s !== "string");
      return Array.isArray(a) ? blanks.filter((b, i) => a[i] === b.answer).length : 0;
    }
  }
}

export function isAnswered(q: Question, a: Answer): boolean {
  if (q.kind === "order") return true;
  if (Array.isArray(a)) return a.every((v) => v !== undefined);
  return a !== undefined;
}

export function totals(questions: Question[], answers: Answer[]) {
  let correct = 0;
  let total = 0;
  questions.forEach((q, i) => {
    correct += score(q, answers[i]);
    total += maxPoints(q);
  });
  return { correct, total };
}
