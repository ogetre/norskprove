import type { ExamTask, Skill } from "@/lib/types";
import type { Draw } from "./draw";
import { listeningTasks, listeningTests } from "./listening";
import { readingTasks, readingTests } from "./reading";

export type TestPlan = {
  trial: string[];
  /** Each full test draws new tasks: stage 1, then the easy or hard stage 2. */
  full: { minutes: number; stage1: Draw; easy: Draw; hard: Draw };
};

type SkillContent = { tasks: ExamTask[]; tests: TestPlan; trialMinutes: number };

/** Skills with ready-made tasks (reading and listening). Writing and speaking use prompts instead. */
export const content: Partial<Record<Skill, SkillContent>> = {
  lesing: { tasks: readingTasks, tests: readingTests, trialMinutes: 10 },
  lytting: { tasks: listeningTasks, tests: listeningTests, trialMinutes: 10 },
};

export function getTask(skill: Skill, id: string): ExamTask | undefined {
  return content[skill]?.tasks.find((t) => t.id === id);
}

export function pickTasks(skill: Skill, ids: string[]): ExamTask[] {
  return ids.map((id) => {
    const task = getTask(skill, id);
    if (!task) throw new Error(`Unknown ${skill} task: ${id}`);
    return task;
  });
}
