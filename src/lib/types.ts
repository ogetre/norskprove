export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export type Skill = "lesing" | "lytting" | "skriving" | "muntlig";

export const SKILL_NAMES: Record<Skill, string> = {
  lesing: "Lesing",
  lytting: "Lytting",
  skriving: "Skriving",
  muntlig: "Muntlig",
};

export type Question =
  | {
      kind: "choice";
      prompt: string;
      options: string[];
      answer: number;
      explanation: string;
    }
  | {
      kind: "truefalse";
      prompt: string;
      answer: boolean;
      explanation: string;
    }
  | {
      /** Pair each left item with one of the right options (there may be extra options). */
      kind: "match";
      prompt: string;
      left: string[];
      right: string[];
      answer: number[];
      explanation: string;
    }
  | {
      /** `items` are listed in the correct order; they are shown shuffled. */
      kind: "order";
      prompt: string;
      items: string[];
      explanation: string;
    }
  | {
      /** Text with blanks; each blank picks one of its options. */
      kind: "gap";
      prompt: string;
      segments: (string | { options: string[]; answer: number })[];
      explanation: string;
    };

export type QuestionKind = Question["kind"];

export const QUESTION_KIND_NAMES: Record<QuestionKind, string> = {
  choice: "Velg riktig svar",
  truefalse: "Riktig eller galt",
  match: "Koble sammen",
  order: "Sett i riktig rekkefølge",
  gap: "Fyll inn riktig ord",
};

export type Mode = "trial" | "quick" | "full" | "text";

export type Glossary = [word: string, meaning: string][];

export interface ReadingTask {
  id: string;
  level: Level;
  title: string;
  genre: string;
  paragraphs: string[];
  signature?: string;
  glossary: Glossary;
  questions: Question[];
}

export interface ListeningLine {
  speaker: "A" | "B";
  text: string;
}

export interface ListeningTask {
  id: string;
  level: Level;
  title: string;
  genre: string;
  situation: string;
  /** Names shown in the transcript, e.g. { A: "Kari", B: "Ahmed" } */
  speakers: Record<"A" | "B", string>;
  lines: ListeningLine[];
  maxPlays: number;
  glossary: Glossary;
  questions: Question[];
}

/** A task in a reading or listening test. */
export type ExamTask = ReadingTask | ListeningTask;

export function isListening(task: ExamTask): task is ListeningTask {
  return "lines" in task;
}

export interface WritingPrompt {
  id: string;
  level: Level;
  title: string;
  kind: "e-post" | "meningstekst" | "fortelling" | "beskrivelse";
  task: string;
  points: string[];
  minWords: number;
  maxWords: number;
  minutes: number;
}

export interface SpeakingPrompt {
  id: string;
  level: Level;
  title: string;
  kind: "presentasjon" | "samtale" | "mening";
  question: string;
  hints: string[];
  prepSeconds: number;
  speakSeconds: number;
}

export interface VocabCard {
  id: string;
  word: string;
  meaning: string;
  example: string;
  en: string;
  theme: string;
  level: Level;
}

export interface GrammarTopic {
  id: GrammarTopicId;
  level: Level;
  title: string;
  short: string;
  explanation: string[];
  examples: { wrong?: string; right: string; note?: string }[];
  exercises: Question[];
}

export type GrammarTopicId =
  | "v2"
  | "leddsetning"
  | "substantiv"
  | "adjektiv"
  | "verbtid"
  | "preposisjoner";

export type ExamGoal =
  | "statsborgerskap"
  | "permanent-opphold"
  | "jobb"
  | "studier"
  | "annet";

/* ---------- Saved progress ---------- */

export interface Attempt {
  id: string;
  skill: Skill;
  taskId: string;
  level: Level;
  correct: number;
  total: number;
  at: string;
  /** How the task was taken; missing on attempts saved before modes existed. */
  mode?: Mode;
  /** Level result of a full or trial test. */
  result?: Level | "under A1";
}

export interface WritingFeedback {
  level_estimate: "A1" | "A2" | "B1" | "B2" | "C1";
  summary: string;
  criteria: { name: string; level: string; comment: string }[];
  errors: {
    original: string;
    correction: string;
    explanation: string;
    topic: string;
  }[];
  improved_text: string;
  tips: string[];
}

export interface WritingSubmission {
  id: string;
  promptId: string;
  text: string;
  words: number;
  at: string;
  feedback?: WritingFeedback;
}

export interface SpeakingFeedback {
  level_estimate: "A1" | "A2" | "B1" | "B2" | "C1";
  summary: string;
  strengths: string[];
  improvements: { original: string; better: string; explanation: string }[];
  model_answer: string;
}

export interface SpeakingSubmission {
  id: string;
  promptId: string;
  transcript: string;
  seconds: number;
  at: string;
  feedback?: SpeakingFeedback;
}

export interface SrsState {
  due: string;
  interval: number;
  ease: number;
  reps: number;
}

export interface Profile {
  onboarded: boolean;
  goal?: ExamGoal;
  examDate?: string;
  targetLevel?: Level;
}

export interface AppState {
  version: 1;
  profile: Profile;
  testLevels: Partial<Record<Skill, Level>>;
  attempts: Attempt[];
  writing: WritingSubmission[];
  speaking: SpeakingSubmission[];
  srs: Record<string, SrsState>;
  grammarErrors: Record<string, number>;
  xp: number;
  activeDays: string[];
}
