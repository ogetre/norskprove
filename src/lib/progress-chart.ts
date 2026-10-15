import { FEEDBACK_LEVELS } from "./feedback-topics";
import { LEVELS, type AppState, type Attempt, type Level, type Skill, type WritingSubmission } from "./types";

/*
 * The results chart puts every result on one level scale, so tasks and full tests of any
 * level can be compared: 0–1 is under A1, 1–2 A1, 2–3 A2, 3–4 B1 and 4–5 B2.
 */

export const SCALE_BANDS = ["Under A1", "A1", "A2", "B1", "B2"] as const;
export const SCALE_TOP = SCALE_BANDS.length;

/** The band a level starts at; C1 counts as the top of B2. */
export function bandStart(level: Level | "under A1" | "C1"): number {
  if (level === "under A1") return 0;
  if (level === "C1") return SCALE_TOP;
  return LEVELS.indexOf(level) + 1;
}

export function bandName(value: number): string {
  return SCALE_BANDS[Math.max(0, Math.min(SCALE_TOP - 1, Math.floor(value)))];
}

const TOP = SCALE_TOP - 0.01;
const clamp = (v: number) => Math.max(0, Math.min(TOP, v));

/**
 * Where a task result lands. At least 70 % right shows the task's level (the same rule as
 * the level estimate); less lands in the band below, lower the fewer points.
 */
export function taskScale(level: Level, share: number): number {
  const band = bandStart(level);
  return clamp(share >= 0.7 ? band + ((share - 0.7) / 0.3) * 0.99 : band - 1 + (share / 0.7) * 0.99);
}

/** AI feedback places a text by its overall level and the level of each criterion. */
function feedbackScale(feedback: NonNullable<WritingSubmission["feedback"]>): number {
  const levels = [feedback.level_estimate, ...feedback.criteria.map((c) => c.level)].filter(
    (l): l is (typeof FEEDBACK_LEVELS)[number] => (FEEDBACK_LEVELS as readonly string[]).includes(l),
  );
  const mean = levels.reduce((n, l) => n + bandStart(l), 0) / Math.max(1, levels.length);
  return clamp(mean + 0.5);
}

/** The written text an attempt was for: by id, or for older attempts the text handed in at the same moment. */
export function submissionFor(state: AppState, a: Attempt): WritingSubmission | undefined {
  if (a.submissionId) return state.writing.find((w) => w.id === a.submissionId);
  const t = Date.parse(a.at);
  return state.writing.find((w) => w.promptId === a.taskId && Math.abs(Date.parse(w.at) - t) < 5000);
}

function attemptScale(state: AppState, a: Attempt): number {
  if (a.scale !== undefined) return clamp(a.scale);
  if (a.result) return clamp(bandStart(a.result) + 0.5);
  if (a.skill === "skriving") {
    const feedback = submissionFor(state, a)?.feedback;
    if (feedback) return feedbackScale(feedback);
  }
  return taskScale(a.level, a.correct / Math.max(1, a.total));
}

export type ChartSeries = "prove" | "oppgave";

export type ChartPoint = {
  at: string;
  series: ChartSeries;
  /** Where the line goes: the result itself for tests, the mean of the last three for tasks. */
  value: number;
  /** This result alone. */
  own: number;
  title: string;
  detail: string;
  date: string;
};

const MODE_TITLE = { quick: "Øving", text: "Oppgave", full: "Full delprøve", trial: "Prøvetest" } as const;

/** Tasks in a running average for the task line. */
const WINDOW = 3;

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short" }).replace(".", "");
}

/**
 * Full writing and speaking tests record one attempt per text or task; the parts of one
 * test are saved within moments of each other and count as one result.
 */
function groupTests(attempts: Attempt[]): Attempt[][] {
  const groups: Attempt[][] = [];
  for (const a of attempts) {
    const last = groups.at(-1)?.at(-1);
    if (last && last.mode === a.mode && Math.abs(Date.parse(a.at) - Date.parse(last.at)) < 10_000) groups.at(-1)!.push(a);
    else groups.push([a]);
  }
  return groups;
}

/** Full tests and trials of a skill, oldest first, each with its place on the level scale. */
export function testResults(state: AppState, skill: Skill): { at: string; mode: "full" | "trial"; parts: Attempt[]; value: number }[] {
  const tests = state.attempts.filter((a) => a.skill === skill && (a.mode === "full" || a.mode === "trial"));
  return groupTests(tests).map((parts) => ({
    at: parts[0].at,
    mode: parts[0].mode as "full" | "trial",
    parts,
    value: parts.reduce((n, a) => n + attemptScale(state, a), 0) / parts.length,
  }));
}

/** The latest results of a skill for the chart, oldest first. */
export function chartPoints(state: AppState, skill: Skill, limit = 30): ChartPoint[] {
  const tests: ChartPoint[] = testResults(state, skill).map((t) => {
    const level = bandName(t.value);
    const parts = t.parts.length > 1 ? `${t.parts.length} deler, ` : "";
    return {
      at: t.at,
      series: "prove",
      value: t.value,
      own: t.value,
      title: MODE_TITLE[t.mode],
      detail: `${parts}nivå ${level}`,
      date: dateLabel(t.at),
    };
  });

  const recent: number[] = [];
  const tasks: ChartPoint[] = state.attempts
    .filter((a) => a.skill === skill && a.mode !== "full" && a.mode !== "trial")
    .map((a) => {
      const own = attemptScale(state, a);
      recent.push(own);
      const window = recent.slice(-WINDOW);
      const percent = Math.round((a.correct / Math.max(1, a.total)) * 100);
      const graded = a.skill === "skriving" && submissionFor(state, a)?.feedback;
      return {
        at: a.at,
        series: "oppgave",
        value: window.reduce((n, v) => n + v, 0) / window.length,
        own,
        title: MODE_TITLE[a.mode ?? "text"],
        detail: graded
          ? `${a.level}-oppgave, AI-vurdert til ${bandName(own)}`
          : `${a.level}-oppgave, ${percent} % ${a.skill === "skriving" || a.skill === "muntlig" ? "av kravene" : "riktig"}`,
        date: dateLabel(a.at),
      };
    });

  return [...tests, ...tasks].sort((x, y) => x.at.localeCompare(y.at)).slice(-limit);
}
