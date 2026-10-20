import type { Skill } from "./types";

export type PlanId = "start" | "pluss" | "premium";

/**
 * While NorskprøveKlar is in its free beta, everything is open to everyone, to see how much the
 * site is used before payment opens. Signing in is only needed for AI feedback, which keeps its
 * quotas and daily budgets. Set to false when payment opens.
 */
export const FREE_BETA = true;
/** AI checks of the oral test a month for every account during the beta. */
export const BETA_ORAL_CHECKS = 5;
/** Texts the AI feedback grades a month for every account during the beta. */
export const BETA_WRITING_CHECKS = 5;

/** Which parts of the exam each plan unlocks. */
export const PLAN_SKILLS: Record<PlanId, Skill[]> = {
  start: ["lesing", "lytting", "muntlig"],
  pluss: ["lesing", "lytting", "skriving", "muntlig"],
  premium: ["lesing", "lytting", "skriving", "muntlig"],
};

export function planCovers(plan: PlanId | null, skill: Skill): boolean {
  return FREE_BETA || (plan !== null && PLAN_SKILLS[plan].includes(skill));
}

/** AI feedback on written texts is part of Premium, and open to every account in the beta. */
export function planHasAiFeedback(plan: PlanId | null): boolean {
  return FREE_BETA || plan === "premium";
}

/** How many texts the AI feedback grades a month: no limit (null) in Premium, a few in the beta. */
export function writingFeedbackLimit(plan: PlanId | null): number | null {
  return plan === "premium" ? null : BETA_WRITING_CHECKS;
}

/** How much AI feedback on texts the learner has this month; `limit` and `left` are null for no limit. */
export type WritingAllowance = { limit: number | null; used: number; left: number | null };

/**
 * AI checks of the oral test a month in each plan (an oral test or a practice task each); null
 * is no limit. Without a plan, every signed-in learner can have one oral test checked for free.
 */
export const PLAN_ORAL_CHECKS: Record<PlanId, number | null> = { start: 3, pluss: 10, premium: null };
export const FREE_ORAL_CHECKS = 1;

/** How many oral checks the learner has; `limit` and `left` are null for no limit. */
export type OralAllowance = { limit: number | null; used: number; left: number | null; free: boolean };

/**
 * The oral checks an account gets: a plan's or the beta's each month, otherwise the one free
 * check for all time (`free`). Free checks are counted apart, so they never use up a plan's.
 */
export function oralQuota(plan: PlanId | null): { limit: number | null; free: boolean } {
  if (plan) return { limit: PLAN_ORAL_CHECKS[plan], free: false };
  if (FREE_BETA) return { limit: BETA_ORAL_CHECKS, free: false };
  return { limit: FREE_ORAL_CHECKS, free: true };
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  recommended?: boolean;
}

// Prices in NOK per month. Placeholder values until pricing is decided.
export const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    price: 129,
    tagline: "For deg som vil trene lesing, lytting og muntlig.",
    features: [
      "Lesing og lytting: alle oppgavetyper",
      "Muntlig med sensor som snakker, og AI-vurdering av 3 prøver i måneden",
      "Fulle delprøver med tidtaker",
      "Statistikk og nivå per delprøve",
    ],
  },
  {
    id: "pluss",
    name: "Pluss",
    price: 199,
    tagline: "Alle fire delprøvene. Det de fleste velger.",
    recommended: true,
    features: [
      "Alt i Start",
      "Skriving: oppgaver på alle nivåer, sjekk av kravene og eksempeltekster",
      "Muntlig: AI-vurdering av 10 prøver i måneden, også av uttalen",
      "Fulle delprøver i alle fire delene",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 299,
    tagline: "For deg som skal ta prøven snart.",
    features: [
      "Alt i Pluss",
      "AI-tilbakemelding på skriving: feil, rettelser og nivå",
      "Ubegrenset AI-vurdering av muntlig, også av uttalen",
      "Rapport med det du bør øve mest på",
      "Nye oppgaver hver måned",
    ],
  },
];
