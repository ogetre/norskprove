import { dayKey } from "./store";
import type { SavedWord, SrsState } from "./types";

/*
 * Spaced repetition for saved words, a simplified SM-2: each answer sets how many days
 * pass before the word comes back, longer the better it was known.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: "again", label: "Igjen", key: "1" },
  { grade: "hard", label: "Vanskelig", key: "2" },
  { grade: "good", label: "Bra", key: "3" },
  { grade: "easy", label: "Lett", key: "4" },
];

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function schedule(prev: SrsState | undefined, grade: Grade, today = dayKey()): SrsState {
  const reps = prev?.reps ?? 0;
  const last = prev?.interval ?? 0;
  let ease = prev?.ease ?? 2.5;
  let interval: number;
  switch (grade) {
    case "again":
      ease = Math.max(1.3, ease - 0.2);
      return { due: today, interval: 0, ease, reps: 0 };
    case "hard":
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(last * 1.2));
      break;
    case "good":
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(last + 1, Math.round(last * ease));
      break;
    case "easy":
      interval = reps === 0 ? 4 : Math.max(last + 2, Math.round(last * ease * 1.3));
      ease += 0.15;
      break;
  }
  return { due: addDays(today, interval), interval, ease, reps: reps + 1 };
}

/** «i dag», «i morgen», «om 3 dager» */
export function inDays(n: number): string {
  if (n <= 0) return "i dag";
  if (n === 1) return "i morgen";
  return `om ${n} dager`;
}

/** New words a day can bring into the review, so a long list doesn't swamp it. */
const NEW_PER_SESSION = 10;

/** Words to review now: those due, oldest first, then a few never reviewed. */
export function reviewQueue(words: SavedWord[], srs: Record<string, SrsState>, today = dayKey()): SavedWord[] {
  const due = words
    .filter((w) => srs[w.id] && srs[w.id].due <= today)
    .sort((a, b) => srs[a.id].due.localeCompare(srs[b.id].due));
  const fresh = words
    .filter((w) => !srs[w.id])
    .reverse()
    .slice(0, NEW_PER_SESSION);
  return [...due, ...fresh];
}
