import type { SpeakingTask } from "@/content/speaking";
import { levelIndex } from "./levels";
import { countWords, usedConnectors, type Check } from "./writing-checks";

export type Answer = {
  question: string;
  url: string | null;
  transcript: string;
  seconds: number;
  typed: boolean;
  /** A follow-up question from the AI examiner, not one of the task's own. */
  followUp?: boolean;
};

/** Answers to a task's own questions; the AI examiner's follow-ups come in between. */
export function scriptedCount(row: Answer[]): number {
  return row.filter((a) => !a.followUp).length;
}

/** Rule-based checks of one spoken answer. AI assessment of the language comes later. */
export function checkAnswer(task: SpeakingTask, a: Answer): Check[] {
  const lvl = levelIndex(task.level);
  const checks: Check[] = [];

  if (!a.typed) {
    const need = Math.max(10, Math.round(task.speakSeconds * 0.5));
    checks.push({
      id: "time",
      label: "Taletid",
      ok: a.seconds >= need,
      detail:
        a.seconds >= need
          ? `Du snakket i ${a.seconds} sekunder.`
          : `Du snakket i ${a.seconds} sekunder. Prøv å snakke i minst ${need} sekunder.`,
    });
  }

  if (a.transcript) {
    const words = countWords(a.transcript);
    const needWords = Math.round(task.speakSeconds * [0.35, 0.5, 0.7, 0.85][lvl]);
    checks.push({
      id: "words",
      label: "Mengde",
      ok: words >= needWords,
      detail:
        words >= needWords
          ? `${words} ord. Du sier nok til å svare godt.`
          : `${words} ord. Prøv å utdype svaret, for eksempel med en grunn eller et eksempel (minst ${needWords} ord).`,
    });
    const needConn = [0, 1, 2, 3][lvl];
    if (needConn > 0) {
      const conn = usedConnectors(a.transcript);
      checks.push({
        id: "connectors",
        label: "Bindeord",
        ok: conn.length >= needConn,
        detail:
          conn.length >= needConn
            ? `Du bruker ${conn.join(", ")}.`
            : `Bruk minst ${needConn} bindeord, for eksempel «fordi», «men» eller «derfor».`,
      });
    }
  }

  return checks;
}
