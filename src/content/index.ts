import type { ExamTask, Skill } from "@/lib/types";
import { listeningTasks, listeningTests } from "./listening";
import { readingTasks, readingTests } from "./reading";

export type TestPlan = {
  trial: string[];
  full: { minutes: number; stage1: string[]; easy: string[]; hard: string[] };
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
