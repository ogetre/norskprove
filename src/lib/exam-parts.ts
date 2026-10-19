import { bandStart } from "./progress-chart";
import { shuffle } from "./random";
import { totals, type Answer } from "./scoring";
import { LEVELS, type ExamTask, type Level, type QuestionKind } from "./types";

/*
 * The adaptive tests of Norskprøven, reading and listening: two short pre-tests (forprøver), then
 * a main test (hovedprøve). The first pre-test is at A2; its result picks an easier or harder
 * second pre-test, and both pick one of three main tests, at A1–A2, A2–B1 or B1–B2.
 */

export type Route = "easy" | "hard";
export type Band = "A1–A2" | "A2–B1" | "B1–B2";
export type PartKind = "forprove1" | "forprove2" | "hoved";
export const KINDS: PartKind[] = ["forprove1", "forprove2", "hoved"];

/** Questions per level in each part; a task's questions count as tasks, as in the exam. */
export type PartPlan = {
  forprove1: Partial<Record<Level, number>>;
  forprove2: Record<Route, Partial<Record<Level, number>>>;
  hoved: Record<Band, Partial<Record<Level, number>>>;
};

export const PART_NAMES: Record<PartKind, string> = {
  forprove1: "Forprøve 1",
  forprove2: "Forprøve 2",
  hoved: "Hovedprøven",
};

/** The task's question type beyond plain multiple choice and true/false, if any. */
function special(task: ExamTask): QuestionKind | undefined {
  return task.questions.find((q) => q.kind !== "choice" && q.kind !== "truefalse")?.kind;
}

/**
 * Random tasks with about `target` questions per level, easiest level first. A task that would
 * overshoot by more than two questions is passed over while others fit, and so is a second
 * matching, gap or ordering task at the same level, so a part mixes formats. Drawn tasks go into `used`.
 */
function draw<T extends ExamTask>(tasks: T[], target: Partial<Record<Level, number>>, used: Set<string>): T[] {
  const picked: T[] = [];
  for (const level of LEVELS) {
    const want = target[level];
    if (!want) continue;
    const pool = shuffle(tasks.filter((t) => t.level === level && !used.has(t.id)));
    let count = 0;
    let specials = 0;
    for (const fitting of [true, false]) {
      for (const t of pool) {
        if (count >= want) break;
        if (used.has(t.id)) continue;
        if (fitting && (count + t.questions.length > want + 2 || (special(t) && specials > 0))) continue;
        used.add(t.id);
        picked.push(t);
        count += t.questions.length;
        if (special(t)) specials++;
      }
    }
  }
  return picked;
}

export function drawPart<T extends ExamTask>(
  plan: PartPlan,
  tasks: T[],
  kind: PartKind,
  used: Set<string>,
  route: Route | null = null,
  band: Band | null = null,
): T[] {
  if (kind === "forprove1") return draw(tasks, plan.forprove1, used);
  if (kind === "forprove2") return draw(tasks, plan.forprove2[route ?? "easy"], used);
  return draw(tasks, plan.hoved[band ?? "A1–A2"], used);
}

export function share(tasks: ExamTask[], answers: Answer[][]): number {
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

/** The name of each part as the result shows it, with the level it was at. */
export function partLabel(kind: PartKind, route: Route | null, band: Band | null): string {
  if (kind === "forprove1") return "Forprøve 1 (A2)";
  if (kind === "forprove2") return `Forprøve 2 (${route === "hard" ? "vanskelig, B1" : "lett, A1"})`;
  return `Hovedprøven (${band})`;
}

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
export function examResult(tasks: ExamTask[], answers: Answer[][]): ExamResult {
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
