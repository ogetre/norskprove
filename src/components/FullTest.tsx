"use client";

import { useState } from "react";
import type { TestPlan } from "@/content";
import { drawTasks } from "@/content/draw";
import type { ExamTask, Skill } from "@/lib/types";
import { TestRunner } from "./TestRunner";

/**
 * A full adaptive test with tasks drawn at random from the whole bank, so every attempt is new.
 * Only rendered inside Paywall, which mounts its children on the client, so the draw never has
 * to match a server render.
 */
export function FullTest({ skill, tasks, plan }: { skill: Skill; tasks: ExamTask[]; plan: TestPlan["full"] }) {
  const [drawn] = useState(() => {
    const used = new Set<string>();
    return {
      stage1: drawTasks(tasks, plan.stage1, used),
      easy: drawTasks(tasks, plan.easy, used),
      hard: drawTasks(tasks, plan.hard, used),
    };
  });

  return <TestRunner skill={skill} mode="full" minutes={plan.minutes} {...drawn} backHref={`/trening/${skill}`} />;
}
