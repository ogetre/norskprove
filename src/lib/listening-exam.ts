import { drawPart as drawFrom, type Band, type PartKind, type PartPlan, type Route } from "./exam-parts";
import type { ListeningTask } from "./types";

/*
 * The listening test as Norskprøven runs it: two short pre-tests (forprøver) of 7–8 tasks, then
 * a main test (hovedprøve) of 16–20 tasks (see exam-parts). Every task plays by itself: twice at
 * A1–B1, once at B2. The test moves on by itself and never goes back.
 */

export { bandAfter, examResult, KINDS, PART_NAMES, partLabel, routeAfter, share } from "./exam-parts";
export type { Band, ExamResult, PartKind, Route } from "./exam-parts";

const PLAN: PartPlan = {
  forprove1: { A2: 8 },
  forprove2: { easy: { A1: 8 }, hard: { B1: 8 } },
  hoved: {
    "A1–A2": { A1: 9, A2: 9 },
    "A2–B1": { A2: 9, B1: 9 },
    "B1–B2": { B1: 9, B2: 9 },
  },
};

export function drawPart(tasks: ListeningTask[], kind: PartKind, used: Set<string>, route: Route | null = null, band: Band | null = null) {
  return drawFrom(PLAN, tasks, kind, used, route, band);
}

/** How many times the recording plays: once at B2, as in the exam, otherwise twice. */
export function playsFor(task: ListeningTask): number {
  return task.level === "B2" ? 1 : 2;
}

/** Seconds to read the questions before the recording starts. */
export function readSeconds(task: ListeningTask): number {
  return Math.min(25, 8 + 4 * task.questions.length);
}

/** Seconds to finish answering after the last playback. */
export function answerSeconds(task: ListeningTask): number {
  return Math.min(45, 10 + 7 * task.questions.length);
}

/** Seconds between the first and the second playback. */
export const GAP_SECONDS = 3;

/** What the instruction before each part says, on screen and aloud. */
export function briefing(kind: PartKind, band: Band | null) {
  if (kind === "forprove1") {
    return {
      title: "Forprøve 1",
      points: [
        "Lytteprøven har tre deler: to korte forprøver og en hovedprøve.",
        "På hver oppgave leser du først spørsmålene. Så hører du lytteteksten to ganger.",
        "Du kan svare mens du hører. Etterpå får du litt tid til å svare.",
        "Prøven går videre av seg selv, og du kan ikke gå tilbake.",
      ],
      speech:
        "Velkommen til lytteprøven. Nå starter forprøve nummer én. På hver oppgave leser du først spørsmålene. Så hører du lytteteksten to ganger. Du kan svare mens du hører, og etterpå får du litt tid til å svare. Prøven går videre av seg selv, og du kan ikke gå tilbake.",
    };
  }
  if (kind === "forprove2") {
    return {
      title: "Forprøve 2",
      points: ["Oppgavene her er valgt ut fra svarene dine i forprøve 1.", "Du hører lytteteksten to ganger, som før."],
      speech: "Nå starter forprøve nummer to. Oppgavene er valgt ut fra svarene dine i den første forprøven. Du hører lytteteksten to ganger, som før.",
    };
  }
  const once = band === "B1–B2";
  return {
    title: `Hovedprøven (${band})`,
    points: [
      "Hovedprøven er den lengste delen, med rundt tjue spørsmål.",
      once
        ? "På oppgaver på nivå B2 hører du lytteteksten bare én gang. Ellers hører du den to ganger."
        : "Du hører lytteteksten to ganger.",
      "Noen oppgaver kan føles vanskelige. Ikke gi opp, det kommer lettere oppgaver også.",
    ],
    speech: `Nå starter hovedprøven. Den er den lengste delen. ${
      once ? "På oppgaver på nivå B2 hører du lytteteksten bare én gang. Ellers hører du den to ganger." : "Du hører lytteteksten to ganger."
    } Hvis en oppgave føles vanskelig, ikke gi opp. Det kommer lettere oppgaver også.`,
  };
}

/** Every instruction the exam can read aloud, for recording them. */
export function briefingSpeeches(): string[] {
  return [
    briefing("forprove1", null).speech,
    briefing("forprove2", null).speech,
    briefing("hoved", "A1–A2").speech,
    briefing("hoved", "B1–B2").speech,
  ];
}
