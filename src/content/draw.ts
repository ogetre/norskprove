import { shuffle } from "@/lib/random";
import type { ExamTask, Level, QuestionKind } from "@/lib/types";

/** How many tasks to draw at each level. */
export type Draw = Partial<Record<Level, number>>;

/** The task's question type beyond plain multiple choice and true/false, if any. */
function special(task: ExamTask): QuestionKind | undefined {
  return task.questions.find((q) => q.kind !== "choice" && q.kind !== "truefalse")?.kind;
}

/**
 * Random tasks for one part of a test, easiest level first. Each level gets at most one
 * match, gap or order task, and no two of the same type, so a test mixes formats.
 * Tasks in `used` are skipped, and the drawn ones are added to it.
 */
export function drawTasks(tasks: ExamTask[], draw: Draw, used: Set<string>): ExamTask[] {
  const picked: ExamTask[] = [];
  const kinds = new Set<QuestionKind>();
  for (const [level, n = 0] of Object.entries(draw)) {
    const pool = shuffle(tasks.filter((t) => t.level === level && !used.has(t.id)));
    const take: ExamTask[] = [];
    let specials = 0;
    for (const t of pool) {
      if (take.length === n) break;
      const k = special(t);
      if (k && (specials > 0 || kinds.has(k))) continue;
      if (k) {
        kinds.add(k);
        specials++;
      }
      take.push(t);
    }
    for (const t of pool) if (take.length < n && !take.includes(t)) take.push(t);
    take.forEach((t) => used.add(t.id));
    picked.push(...take);
  }
  return picked;
}
