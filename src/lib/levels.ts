import { LEVELS, type AppState, type Level, type Skill } from "./types";

export function levelIndex(l: Level): number {
  return LEVELS.indexOf(l);
}

/**
 * Estimated level for a skill: the highest level where recent practice is at
 * least 70% correct over 3+ tasks, never below the level-test result.
 */
export function estimateLevel(state: AppState, skill: Skill): Level | undefined {
  const fromTest = state.testLevels[skill];
  let best = fromTest ? levelIndex(fromTest) : -1;

  for (const level of LEVELS) {
    const recent = state.attempts
      .filter((a) => a.skill === skill && a.level === level)
      .slice(-6);
    if (recent.length < 3) continue;
    const correct = recent.reduce((n, a) => n + a.correct, 0);
    const total = recent.reduce((n, a) => n + a.total, 0);
    if (total > 0 && correct / total >= 0.7) best = Math.max(best, levelIndex(level));
  }

  if (skill === "skriving" || skill === "muntlig") {
    const subs = skill === "skriving" ? state.writing : state.speaking;
    const graded = subs.filter((s) => s.feedback).slice(0, 3);
    for (const s of graded) {
      const l = s.feedback!.level_estimate;
      if (l !== "C1") best = Math.max(best, levelIndex(l));
      else best = LEVELS.length - 1;
    }
  }

  return best >= 0 ? LEVELS[best] : undefined;
}

export function daysUntil(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const target = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}
