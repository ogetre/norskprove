import { LEVELS, type AppState, type Level, type Skill } from "./types";

export function levelIndex(l: Level): number {
  return LEVELS.indexOf(l);
}

/**
 * Estimated level for a skill. The latest full test is the main signal; practice
 * can raise it (3+ recent tasks at a level with at least 70% correct). A trial
 * result is used only when there is nothing else.
 */
export function estimateLevel(state: AppState, skill: Skill): Level | undefined {
  const own = state.attempts.filter((a) => a.skill === skill);
  const lastResult = (mode: "full" | "trial") => [...own].reverse().find((a) => a.mode === mode && a.result)?.result;
  const asIndex = (r: Level | "under A1" | undefined) => (r && r !== "under A1" ? levelIndex(r) : -1);

  const fromTest = state.testLevels[skill];
  let best = Math.max(fromTest ? levelIndex(fromTest) : -1, asIndex(lastResult("full")));

  // Full tests and trials store their result as the level, so they are not practice.
  const practice = own.filter((a) => a.mode !== "full" && a.mode !== "trial");
  for (const level of LEVELS) {
    const recent = practice.filter((a) => a.level === level).slice(-6);
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

  if (best < 0) best = asIndex(lastResult("trial"));
  return best >= 0 ? LEVELS[best] : undefined;
}

export function daysUntil(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const target = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}
