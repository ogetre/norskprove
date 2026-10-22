import type { Mode, Skill } from "./types";

/*
 * Counts solved tasks for the owner's statistics (api/activity): only the part of the test and
 * how it was taken, never who. Learners without an account keep their progress in the browser,
 * so this is the only way to see whether they practise at all.
 */

export const ACTIVITY_SKILLS: Skill[] = ["lesing", "lytting", "skriving", "muntlig"];
export const ACTIVITY_MODES: Mode[] = ["trial", "quick", "full", "text"];

export function countActivity(skill: Skill, mode: Mode | undefined) {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon("/api/activity", JSON.stringify({ skill, mode: mode ?? "quick" }));
  } catch {
    // Counting is never worth an error for the learner.
  }
}
