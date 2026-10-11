"use client";

import { useCallback, useState } from "react";
import type { TestPlan } from "@/content";
import { drawTasks } from "@/content/draw";
import { isAnswered, type Answer } from "@/lib/scoring";
import { SKILL_NAMES, type ExamTask, type Skill } from "@/lib/types";
import { clearUnfinished, loadUnfinished, saveUnfinished, savedAtLabel } from "@/lib/unfinished";
import { ResumeCard } from "./ResumeCard";
import { TestRunner, type RunProgress, type RunResume } from "./TestRunner";
import { clock } from "./writing/WritingPractice";

type Saved = RunProgress & { stage1: string[]; easy: string[]; hard: string[]; savedAt: string };
type Run = { key: number; stage1: ExamTask[]; easy: ExamTask[]; hard: ExamTask[]; resume?: RunResume };
type Restored = { saved: Saved; stage1: ExamTask[]; easy: ExamTask[]; hard: ExamTask[]; shown: ExamTask[]; answers: Answer[][] };

function draw(tasks: ExamTask[], plan: TestPlan["full"]) {
  const used = new Set<string>();
  return {
    stage1: drawTasks(tasks, plan.stage1, used),
    easy: drawTasks(tasks, plan.easy, used),
    hard: drawTasks(tasks, plan.hard, used),
  };
}

/** JSON turns unanswered blanks into null; the answer checks expect undefined. */
function revive(answers: unknown[][]): Answer[][] {
  return answers.map((row) =>
    row.map((a) => (a === null ? undefined : Array.isArray(a) ? a.map((v) => v ?? undefined) : a)),
  ) as Answer[][];
}

/** The saved test with its tasks, or null if it is missing or no longer fits the task bank. */
function restore(saved: Saved | null, tasks: ExamTask[]): Restored | null {
  if (!saved) return null;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((t): t is ExamTask => t !== undefined);
  const stage1 = pick(saved.stage1);
  const easy = pick(saved.easy);
  const hard = pick(saved.hard);
  if (stage1.length !== saved.stage1.length || easy.length !== saved.easy.length || hard.length !== saved.hard.length) return null;
  const shown = [...stage1, ...(saved.route === "hard" ? hard : saved.route === "easy" ? easy : [])];
  const answers = revive(saved.answers);
  if (answers.length !== shown.length || shown.some((t, i) => answers[i].length !== t.questions.length)) return null;
  if (saved.plays.length !== shown.length) return null;
  return { saved, stage1, easy, hard, shown, answers };
}

/**
 * A full adaptive test with tasks drawn at random from the whole bank, so every attempt is new.
 * Progress is saved on this device, and an unfinished test can be continued or replaced.
 * Only rendered inside Paywall, which mounts its children on the client, so the draw and the
 * saved test never have to match a server render.
 */
export function FullTest({ skill, tasks, plan }: { skill: Skill; tasks: ExamTask[]; plan: TestPlan["full"] }) {
  const [restored] = useState(() => restore(loadUnfinished<Saved>(skill), tasks));
  const [run, setRun] = useState<Run | null>(() => (restored ? null : { key: 0, ...draw(tasks, plan) }));

  const save = useCallback(
    (progress: RunProgress) => {
      if (!run) return;
      const ids = (list: ExamTask[]) => list.map((t) => t.id);
      saveUnfinished(skill, {
        ...progress,
        stage1: ids(run.stage1),
        easy: ids(run.easy),
        hard: ids(run.hard),
        savedAt: new Date().toISOString(),
      } satisfies Saved);
    },
    [run, skill],
  );
  const finish = useCallback(() => clearUnfinished(skill), [skill]);

  if (!run && restored) {
    const { saved, shown, answers } = restored;
    const questions = shown.flatMap((t) => t.questions);
    const flat = answers.flat();
    const answered = questions.filter((q, i) => isAnswered(q, flat[i])).length;
    return (
      <ResumeCard
        label={`Full delprøve i ${SKILL_NAMES[skill].toLowerCase()}`}
        details={[
          `Lagret ${savedAtLabel(saved.savedAt)}`,
          `${saved.route ? "Del 2" : "Del 1"}, oppgave ${saved.current + 1} av ${shown.length}${saved.route ? "" : "+"}`,
          `${answered} av ${questions.length} spørsmål besvart`,
          `${clock(saved.remaining)} igjen på klokka`,
        ]}
        onContinue={() => {
          const t = Date.now();
          setRun({
            key: 1,
            stage1: restored.stage1,
            easy: restored.easy,
            hard: restored.hard,
            resume: { route: saved.route, answers, current: saved.current, plays: saved.plays, deadline: t + saved.remaining, now: t },
          });
        }}
        onRestart={() => {
          clearUnfinished(skill);
          setRun({ key: 2, ...draw(tasks, plan) });
        }}
      />
    );
  }
  if (!run) return null;

  return (
    <TestRunner
      key={run.key}
      skill={skill}
      mode="full"
      minutes={plan.minutes}
      stage1={run.stage1}
      easy={run.easy}
      hard={run.hard}
      resume={run.resume}
      onProgress={save}
      onFinish={finish}
      backHref={`/trening/${skill}`}
    />
  );
}
