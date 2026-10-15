/** Categories of language errors in AI feedback, with the names shown to the learner. */
export const ERROR_TOPICS = {
  v2: "Ordstilling",
  leddsetning: "Leddsetning",
  verbtid: "Verb og tid",
  substantiv: "Substantiv",
  adjektiv: "Adjektiv",
  pronomen: "Pronomen",
  preposisjoner: "Preposisjoner",
  ordvalg: "Ordvalg",
  rettskriving: "Rettskriving",
  tegnsetting: "Tegnsetting",
  annet: "Annet",
} as const;

export type ErrorTopic = keyof typeof ERROR_TOPICS;

export const ERROR_TOPIC_IDS = Object.keys(ERROR_TOPICS) as [ErrorTopic, ...ErrorTopic[]];

export function topicName(topic: string): string {
  return ERROR_TOPICS[topic as ErrorTopic] ?? "Annet";
}

/** What the AI assesses a written text on, in the order it is shown. */
export const WRITING_CRITERIA = [
  "Oppgaveløsning",
  "Sammenheng og struktur",
  "Ordforråd",
  "Grammatikk",
  "Rettskriving og tegnsetting",
] as const;

export const FEEDBACK_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type FeedbackLevel = (typeof FEEDBACK_LEVELS)[number];
