import { bandStart } from "./progress-chart";
import { shuffle } from "./random";
import { totals, type Answer } from "./scoring";
import { LEVELS, type Level, type ListeningTask } from "./types";

/*
 * The listening test as Norskprøven runs it: two short pre-tests (forprøver) of 7–8 tasks, then
 * a main test (hovedprøve) of 16–20 tasks. The first pre-test is at A2; its result picks an
 * easier or harder second pre-test, and both pick one of three main tests. Every task plays by
 * itself: twice at A1–B1, once at B2. The test moves on by itself and never goes back.
 */

export type Route = "easy" | "hard";
export type Band = "A1–A2" | "A2–B1" | "B1–B2";
export type PartKind = "forprove1" | "forprove2" | "hoved";

/** Questions per level in each part; a task's questions count as tasks, as in the exam. */
const FORPROVE1: Partial<Record<Level, number>> = { A2: 8 };
const FORPROVE2: Record<Route, Partial<Record<Level, number>>> = { easy: { A1: 8 }, hard: { B1: 8 } };
const HOVED: Record<Band, Partial<Record<Level, number>>> = {
  "A1–A2": { A1: 9, A2: 9 },
  "A2–B1": { A2: 9, B1: 9 },
  "B1–B2": { B1: 9, B2: 9 },
};

export const PART_NAMES: Record<PartKind, string> = {
  forprove1: "Forprøve 1",
  forprove2: "Forprøve 2",
  hoved: "Hovedprøven",
};

/**
 * Random tasks with about `target` questions per level, easiest level first. A task that would
 * overshoot by more than two questions is passed over while others fit. Drawn tasks go into `used`.
 */
function draw(tasks: ListeningTask[], target: Partial<Record<Level, number>>, used: Set<string>): ListeningTask[] {
  const picked: ListeningTask[] = [];
  for (const level of LEVELS) {
    const want = target[level];
    if (!want) continue;
    const pool = shuffle(tasks.filter((t) => t.level === level && !used.has(t.id)));
    let count = 0;
    for (const fitting of [true, false]) {
      for (const t of pool) {
        if (count >= want) break;
        if (used.has(t.id) || (fitting && count + t.questions.length > want + 2)) continue;
        used.add(t.id);
        picked.push(t);
        count += t.questions.length;
      }
    }
  }
  return picked;
}

export function drawPart(
  tasks: ListeningTask[],
  kind: PartKind,
  used: Set<string>,
  route: Route | null = null,
  band: Band | null = null,
): ListeningTask[] {
  if (kind === "forprove1") return draw(tasks, FORPROVE1, used);
  if (kind === "forprove2") return draw(tasks, FORPROVE2[route ?? "easy"], used);
  return draw(tasks, HOVED[band ?? "A1–A2"], used);
}

export function share(tasks: ListeningTask[], answers: Answer[][]): number {
  const t = totals(
    tasks.flatMap((x) => x.questions),
    answers.flat(),
  );
  return t.total ? t.correct / t.total : 0;
}

/** A good first pre-test leads to the harder second one. */
export function routeAfter(forprove1: number): Route {
  return forprove1 >= 0.6 ? "hard" : "easy";
}

/** The main test both pre-tests point to. */
export function bandAfter(route: Route, forprove1: number, forprove2: number): Band {
  if (route === "hard") return forprove2 >= 0.6 ? "B1–B2" : "A2–B1";
  return forprove2 >= 0.7 && forprove1 >= 0.45 ? "A2–B1" : "A1–A2";
}

/** How many times the recording plays: once at B2, as in the exam, otherwise twice. */
export function playsFor(task: ListeningTask): number {
  return task.level === "B2" ? 1 : 2;
}

/** Seconds to read the questions before the recording starts. */
export function readSeconds(task: ListeningTask): number {
  return Math.min(25, 8 + 4 * task.questions.length);
}

/** Seconds to finish answering after the last playback. */
export function answerSeconds(task: ListeningTask): number {
  return Math.min(45, 10 + 7 * task.questions.length);
}

/** Seconds between the first and the second playback. */
export const GAP_SECONDS = 3;

export type ExamResult = {
  level: Level | "under A1";
  /** Place on the results chart's level scale. */
  scale: number;
  correct: number;
  total: number;
  byLevel: Partial<Record<Level, { correct: number; total: number }>>;
};

/** A level counts as mastered at 60 % of its questions, as long as it had a few of them. */
const PASS = 0.6;

/**
 * The level the answers show: the highest level with 60 % of its questions right. With no
 * level reached, under A1 when A1 was tested, otherwise the level below the easiest one tested.
 */
export function examResult(tasks: ListeningTask[], answers: Answer[][]): ExamResult {
  const byLevel: ExamResult["byLevel"] = {};
  tasks.forEach((t, i) => {
    const r = totals(t.questions, answers[i] ?? []);
    const b = (byLevel[t.level] ??= { correct: 0, total: 0 });
    b.correct += r.correct;
    b.total += r.total;
  });
  const shareOf = (l: Level) => {
    const b = byLevel[l];
    return b && b.total >= 3 ? b.correct / b.total : null;
  };
  const tested = LEVELS.filter((l) => shareOf(l) !== null);
  const passed = tested.filter((l) => shareOf(l)! >= PASS);
  const all = Object.values(byLevel).reduce((n, b) => ({ correct: n.correct + b.correct, total: n.total + b.total }), {
    correct: 0,
    total: 0,
  });

  if (!passed.length) {
    const lowest = tested[0] ?? "A1";
    const level: Level | "under A1" = lowest === "A1" ? "under A1" : LEVELS[LEVELS.indexOf(lowest) - 1];
    const s = shareOf(lowest) ?? 0;
    return { level, scale: bandStart(level) + Math.min(0.99, (s / PASS) * 0.99), ...all, byLevel };
  }
  const level = passed[passed.length - 1];
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const nextShare = next ? shareOf(next) : null;
  // How far into the level: towards the next level when it was tested, else by the level's own score.
  const into = nextShare !== null ? nextShare / PASS : (shareOf(level)! - PASS) / (1 - PASS);
  return { level, scale: bandStart(level) + Math.max(0, Math.min(0.99, into * 0.99)), ...all, byLevel };
}
