import type { ExamTask, Skill } from "@/lib/types";
import { listeningTasks, listeningTests } from "./listening";
import { readingTasks, readingTests } from "./reading";

/** The tasks of the free trial test. The full tests draw their tasks as they go (see exam-parts). */
export type TestPlan = { trial: string[] };

type SkillContent = { tasks: ExamTask[]; tests: TestPlan };

/** Skills with ready-made tasks (reading and listening). Writing and speaking use prompts instead. */
export const content: Partial<Record<Skill, SkillContent>> = {
  lesing: { tasks: readingTasks, tests: readingTests },
  lytting: { tasks: listeningTasks, tests: listeningTests },
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
