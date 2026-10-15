import { daysUntil, estimateLevel, levelIndex } from "./levels";
import { dayKey } from "./store";
import { SKILL_NAMES, type AppState, type ExamGoal, type Level, type Skill } from "./types";

/*
 * «Er jeg klar?»: how sure we are that the learner would pass each part at their target
 * level. A part is only «klar» on evidence close to the exam: a recent full test, or for
 * writing and speaking, AI assessments of several recent answers. Practice alone gives «trolig».
 */

export type ReadinessStatus = "klar" | "trolig" | "nesten" | "langt" | "ukjent";

export interface PartReadiness {
  skill: Skill;
  status: ReadinessStatus;
  level?: Level;
  evidence: string;
  action: { label: string; href: string } | null;
}

export const STATUS_LABEL: Record<ReadinessStatus, string> = {
  klar: "Klar",
  trolig: "Trolig klar",
  nesten: "Nesten",
  langt: "Et stykke igjen",
  ukjent: "Ikke målt",
};

/** The part that counts for a residence or citizenship application, with its usual level. */
export const GOAL_REQUIREMENT: Partial<Record<ExamGoal, { skill: Skill; level: Level; label: string }>> = {
  statsborgerskap: { skill: "muntlig", level: "B1", label: "statsborgerskap" },
  "permanent-opphold": { skill: "muntlig", level: "A2", label: "permanent oppholdstillatelse" },
};

/** Evidence older than this no longer confirms a part. */
const FRESH_DAYS = 60;

const RANK: Record<ReadinessStatus, number> = { ukjent: 0, langt: 1, nesten: 2, trolig: 3, klar: 4 };

function ageInDays(iso: string): number {
  return -(daysUntil(dayKey(new Date(iso))) ?? 0);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
}

const at = (l: string) => (levelIndex(l as Level) >= 0 ? levelIndex(l as Level) : l === "C1" ? 4 : -1);

export function partReadiness(state: AppState, skill: Skill, target: Level): PartReadiness {
  const t = levelIndex(target);
  const estimate = estimateLevel(state, skill);
  const e = estimate ? levelIndex(estimate) : -1;
  const practise = { label: `Øv på ${SKILL_NAMES[skill].toLowerCase()}`, href: `/trening/${skill}` };
  const fullTest = { label: "Ta en full delprøve", href: `/trening/${skill}/prove` };

  const lastFull = [...state.attempts].reverse().find((a) => a.skill === skill && a.mode === "full" && a.result);
  const fullNote = lastFull ? ` Siste delprøve ${shortDate(lastFull.at)}: ${lastFull.result}.` : "";
  if (lastFull && at(lastFull.result!) >= t && ageInDays(lastFull.at) <= FRESH_DAYS) {
    return { skill, status: "klar", level: estimate, evidence: `Du fikk ${lastFull.result} på en full delprøve ${shortDate(lastFull.at)}.`, action: null };
  }

  if (skill === "skriving" || skill === "muntlig") {
    const subs: { at: string; feedback?: { level_estimate: string } }[] = skill === "skriving" ? state.writing : state.speaking;
    const graded = subs.filter((w) => w.feedback).slice(0, 3);
    const enough = graded.filter((w) => at(w.feedback!.level_estimate) >= t).length;
    if (graded.length >= 2 && enough >= 2 && ageInDays(graded[0].at) <= FRESH_DAYS) {
      const what = skill === "skriving" ? "tekstene dine" : "muntlige oppgavene dine";
      return {
        skill,
        status: "klar",
        level: estimate,
        evidence: `AI-sensoren vurderte ${enough} av de siste ${graded.length} ${what} til ${target} eller høyere.`,
        action: null,
      };
    }
  }

  if (e < 0) {
    return {
      skill,
      status: "ukjent",
      evidence: "Vi har ikke nok svar fra deg ennå til å si noe om nivået.",
      action: skill === "skriving" ? { label: "Skriv en tekst", href: "/trening/skriving" } : skill === "muntlig" ? practise : fullTest,
    };
  }

  if (e >= t) {
    const confirm =
      skill === "skriving"
        ? "Få AI-vurdering av et par tekster til for å bekrefte det."
        : skill === "muntlig"
          ? "Få AI-vurdering av et par muntlige oppgaver til for å bekrefte det."
          : `Bekreft det med en full delprøve på ${target}.`;
    return {
      skill,
      status: "trolig",
      level: estimate,
      evidence: `Øvingen din tilsvarer ${estimate}.${fullNote} ${confirm}`,
      action: skill === "skriving" ? { label: "Skriv en tekst", href: "/trening/skriving" } : fullTest,
    };
  }

  return {
    skill,
    status: e === t - 1 ? "nesten" : "langt",
    level: estimate,
    evidence:
      e === t - 1
        ? `Du er på ${estimate}, ett nivå under målet.${fullNote} Øv på oppgaver på ${target}.`
        : `Du er på ${estimate}. Ta ett nivå om gangen, med oppgaver på ${LEVEL_AFTER[estimate!]}.${fullNote}`,
    action: practise,
  };
}

const LEVEL_AFTER: Record<Level, Level> = { A1: "A2", A2: "B1", B1: "B2", B2: "B2" };

const PARTS: Skill[] = ["lesing", "lytting", "skriving", "muntlig"];

export function readiness(state: AppState, target: Level) {
  const parts = PARTS.map((s) => partReadiness(state, s, target));
  const ready = parts.filter((p) => p.status === "klar").length;
  const likely = parts.filter((p) => p.status === "klar" || p.status === "trolig").length;
  const unknown = parts.filter((p) => p.status === "ukjent").length;

  let verdict: string;
  if (ready === parts.length) verdict = `Ja, du ser klar ut for ${target} i alle fire delene.`;
  else if (likely === parts.length) verdict = `Trolig klar for ${target}. Bekreft det med fulle delprøver.`;
  else if (unknown === parts.length) verdict = "Vi vet ikke ennå. Løs noen oppgaver eller ta en delprøve, så ser vi hvor du står.";
  else verdict = `Ikke helt ennå: ${likely} av ${parts.length} deler er på ${target}.`;

  // The part to spend the most time on: the weakest one we have measured below the target.
  const focus = parts.filter((p) => p.status === "nesten" || p.status === "langt").sort((a, b) => RANK[a.status] - RANK[b.status])[0];

  return { parts, ready, likely, verdict, focus };
}
