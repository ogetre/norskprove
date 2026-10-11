import type { Skill } from "@/lib/types";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SkillIcon({ skill, size = 28 }: { skill: Skill; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" {...common}>
      {skill === "lesing" && (
        <>
          <path d="M4 6.5c3-1.2 6.5-1 10 1.2 3.5-2.2 7-2.4 10-1.2v15c-3-1.2-6.5-1-10 1.2-3.5-2.2-7-2.4-10-1.2z" />
          <path d="M14 7.7v15" />
        </>
      )}
      {skill === "lytting" && <path d="M4 14h2.5M9 9v10M13.5 5v18M18 9.5v9M22.5 12v4M25 14h-1" />}
      {skill === "skriving" && (
        <>
          <path d="M5 23l1.2-4.6L18.5 6.1a2.3 2.3 0 013.3 3.3L9.6 21.8z" />
          <path d="M16.5 8.2l3.3 3.3M5 23h18" />
        </>
      )}
      {skill === "muntlig" && (
        <>
          <path d="M5 6.5h18v11H12l-5 4.5v-4.5H5z" />
          <path d="M10 12h.01M14 12h.01M18 12h.01" strokeWidth={2.4} />
        </>
      )}
    </svg>
  );
}

export const SKILLS: { skill: Skill; official: string; blurb: string; trialMinutes: number; ready: boolean }[] = [
  {
    skill: "lesing",
    official: "Leseforståelse",
    blurb: "Oppslag, e-poster og artikler med ulike oppgavetyper.",
    trialMinutes: 10,
    ready: true,
  },
  {
    skill: "lytting",
    official: "Lytteforståelse",
    blurb: "Samtaler og beskjeder du bare får høre et begrenset antall ganger.",
    trialMinutes: 10,
    ready: true,
  },
  {
    skill: "skriving",
    official: "Skriftlig framstilling",
    blurb: "Skriv tekster som på prøven og se hvilke krav du oppfyller.",
    trialMinutes: 15,
    ready: true,
  },
  {
    skill: "muntlig",
    official: "Muntlig prøve",
    blurb: "Sensoren stiller spørsmål med stemme, og du svarer i mikrofonen.",
    trialMinutes: 5,
    ready: true,
  },
];
