import type { Skill } from "./types";

export type PlanId = "start" | "pluss" | "premium";

/** Which parts of the exam each plan unlocks. */
export const PLAN_SKILLS: Record<PlanId, Skill[]> = {
  start: ["lesing", "lytting"],
  pluss: ["lesing", "lytting", "skriving", "muntlig"],
  premium: ["lesing", "lytting", "skriving", "muntlig"],
};

export function planCovers(plan: PlanId | null, skill: Skill): boolean {
  return plan !== null && PLAN_SKILLS[plan].includes(skill);
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
    tagline: "For deg som vil trene lesing og lytting.",
    features: [
      "Lesing og lytting: alle oppgavetyper",
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
      "Muntlig: sensor som snakker, opptak av svarene dine og eksempelsvar",
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
      "AI-tilbakemelding på skriving og muntlig (kommer snart)",
      "Rapport med det du bør øve mest på",
      "Nye oppgaver hver måned",
    ],
  },
];
