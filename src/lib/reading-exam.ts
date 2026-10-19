import { drawPart as drawFrom, type Band, type PartKind, type PartPlan, type Route } from "./exam-parts";
import type { ReadingTask } from "./types";

/*
 * The reading test as Norskprøven runs it: two pre-tests (forprøver) of 7–8 tasks, then a main
 * test (hovedprøve) of 16–23 tasks (see exam-parts). It takes at most 75 minutes, and at most 15
 * of them for each pre-test. Candidates can go back and forth between the tasks of a part, but
 * not back to an earlier part.
 */

export const TOTAL_MINUTES = 75;
export const FORPROVE_MINUTES = 15;

const PLAN: PartPlan = {
  forprove1: { A2: 8 },
  forprove2: { easy: { A1: 8 }, hard: { B1: 8 } },
  hoved: {
    "A1–A2": { A1: 9, A2: 9 },
    "A2–B1": { A2: 9, B1: 9 },
    "B1–B2": { B1: 9, B2: 9 },
  },
};

export function drawPart(tasks: ReadingTask[], kind: PartKind, used: Set<string>, route: Route | null = null, band: Band | null = null) {
  return drawFrom(PLAN, tasks, kind, used, route, band);
}

/** What the page before each part says. */
export function briefing(kind: PartKind, band: Band | null): { title: string; points: string[] } {
  if (kind === "forprove1") {
    return {
      title: "Forprøve 1",
      points: [
        `Leseprøven har tre deler: to korte forprøver og en hovedprøve. Den tar høyst ${TOTAL_MINUTES} minutter.`,
        `Hver forprøve har rundt åtte spørsmål, og du har ${FORPROVE_MINUTES} minutter på hver.`,
        "Du kan gå fram og tilbake mellom oppgavene i samme del, men ikke tilbake til en del du er ferdig med.",
      ],
    };
  }
  if (kind === "forprove2") {
    return {
      title: "Forprøve 2",
      points: [
        "Oppgavene her er valgt ut fra svarene dine i forprøve 1.",
        `Du har ${FORPROVE_MINUTES} minutter. Svarene i forprøve 1 kan du ikke endre lenger.`,
      ],
    };
  }
  return {
    title: `Hovedprøven (${band})`,
    points: [
      "Hovedprøven er den lengste delen, med rundt tjue spørsmål. Resten av prøvetiden er din.",
      "Noen oppgaver kan føles vanskelige. Ikke gi opp, det kommer lettere oppgaver også.",
    ],
  };
}
