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

export type SpeakerId = "A" | "B" | "C" | "D" | "E";

/** Voice type for a speaker; most speakers get theirs from their name, see casting. */
export type VoiceGender = "kvinne" | "mann";

export interface ListeningLine {
  speaker: SpeakerId;
  text: string;
}

export interface ListeningTask {
  id: string;
  level: Level;
  title: string;
  genre: string;
  situation: string;
  /** Names shown in the transcript, e.g. { A: "Kari", B: "Ahmed" }. A monologue only needs A. */
  speakers: { A: string } & Partial<Record<SpeakerId, string>>;
  /** Voice type when the name or role doesn't give it, e.g. { B: "kvinne" } for «Økonom». */
  voices?: Partial<Record<SpeakerId, VoiceGender>>;
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
  /** Place on the results chart's level scale (0 under A1 … 5 top of B2), when the test knows it. */
  scale?: number;
  /** The written text this attempt was for. */
  submissionId?: string;
}

export interface WritingFeedback {
  level_estimate: "A1" | "A2" | "B1" | "B2" | "C1";
  summary: string;
  criteria: { name: string; level: string; comment: string }[];
  errors: {
    /** The wrong words, copied exactly from the text. */
    original: string;
    correction: string;
    explanation: string;
    topic: string;
  }[];
  strengths: string[];
  improved_text: string;
  tips: string[];
  /** Language of the explanations when not Norwegian (A1–A2 learners). */
  lang?: string;
}

/** AI's check of a learner's own corrections; results are by error number, from 1. */
export interface WritingRecheck {
  results: { index: number; fixed: boolean; comment: string }[];
  new_errors: { original: string; correction: string; explanation: string }[];
  summary: string;
}

export interface WritingSubmission {
  id: string;
  promptId: string;
  text: string;
  words: number;
  at: string;
  feedback?: WritingFeedback;
  /** The learner's own corrections after the feedback, and AI's check of them. */
  revision?: { text: string; at: string; check: WritingRecheck };
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
  /** Language code for translations and explanations, see lib/languages. */
  nativeLanguage?: string;
}

/** A dictionary entry for a word in a text, from AI. */
export interface WordEntry {
  lemma: string;
  pos: string;
  gender: string;
  translation: string;
  meaning_no: string;
  forms: { label: string; value: string }[];
  example: string;
  example_translation: string;
  note: string;
}

/** A word the learner saved to practise. */
export interface SavedWord extends WordEntry {
  /** Lemma and part of speech, so the same word is saved once. */
  id: string;
  /** The word as it stood in the text. */
  word: string;
  lang: string;
  taskId: string;
  at: string;
}

export interface AppState {
  version: 1;
  profile: Profile;
  testLevels: Partial<Record<Skill, Level>>;
  attempts: Attempt[];
  writing: WritingSubmission[];
  speaking: SpeakingSubmission[];
  srs: Record<string, SrsState>;
  /** Saved words, newest first; missing in progress saved before words existed. */
  words?: SavedWord[];
  grammarErrors: Record<string, number>;
  xp: number;
  activeDays: string[];
}
