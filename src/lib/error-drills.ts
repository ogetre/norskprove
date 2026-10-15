import { locateErrors } from "./error-spans";
import type { AppState, SrsState, WritingFeedback } from "./types";

/*
 * Exercises made from the learner's own errors in AI writing feedback. Each error becomes
 * one exercise, built without AI, and comes back on the spaced repetition schedule
 * until the learner gets it right over several days.
 */

export type DrillKind = "choose" | "order" | "write";

export interface Drill {
  id: string;
  topic: string;
  original: string;
  correction: string;
  explanation: string;
  /** Language of the explanation when not Norwegian. */
  lang?: string;
  /** The rest of the sentence around the error, empty when it could not be found. */
  before: string;
  after: string;
  /** The error is the right words in the wrong order. */
  reorder: boolean;
  /** Short enough to type the correction. */
  writable: boolean;
  submissionId: string;
  taskId: string;
  /** Where the error was made. */
  source: "skriving" | "muntlig";
}

/** An exercise counts as learnt once its next review is a week or more away. */
export const LEARNT_INTERVAL = 7;

const TYPED_TOPICS = new Set(["rettskriving", "verbtid", "substantiv", "adjektiv", "pronomen", "preposisjoner"]);

/** FNV-1a, so an exercise keeps its id (and review history) across syncs. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const splitWords = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const bare = (w: string) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

function isReorder(original: string, correction: string): boolean {
  const a = splitWords(original).map(bare);
  const b = splitWords(correction).map(bare);
  if (a.length < 2 || a.length > 10 || a.length !== b.length || a.join(" ") === b.join(" ")) return false;
  return [...a].sort().join(" ") === [...b].sort().join(" ");
}

type Span = { start: number; end: number; correction: string };

/**
 * The sentence around [start, end) in the text, split at the error. Other errors in the
 * sentence are shown corrected, so only the one being practised is wrong.
 */
function context(text: string, { start, end }: Span, others: Span[]): { before: string; after: string } {
  if (start < 0) return { before: "", after: "" };
  const fixed = (a: number, b: number) => {
    let out = "";
    let pos = a;
    for (const o of others.filter((o) => o.start >= a && o.end <= b)) {
      out += text.slice(pos, o.start) + o.correction;
      pos = o.end;
    }
    return out + text.slice(pos, b);
  };
  const stops = /[.!?\n]/;
  let from = start;
  while (from > 0 && !stops.test(text[from - 1])) from--;
  let to = end;
  while (to < text.length && !stops.test(text[to])) to++;
  if (to < text.length && text[to] !== "\n") to++;
  let before = fixed(from, start).trimStart();
  let after = fixed(end, to).trimEnd();
  if (before.length > 90) before = "… " + before.slice(-90).replace(/^\S*\s/, "");
  if (after.length > 90) after = after.slice(0, 90).replace(/\s\S*$/, "") + " …";
  return { before, after };
}

type Source = { id: string; taskId: string; source: Drill["source"]; text: string; lang?: string; errors: WritingFeedback["errors"] };

/** Written texts and spoken answers with AI feedback, newest first within each. */
function sources(state: AppState): Source[] {
  const written = state.writing.flatMap((w) =>
    w.feedback ? [{ id: w.id, taskId: w.promptId, source: "skriving" as const, text: w.text, lang: w.feedback.lang, errors: w.feedback.errors }] : [],
  );
  const spoken = state.speaking.flatMap((s) =>
    s.feedback
      ? [
          {
            id: s.id,
            taskId: s.promptId,
            source: "muntlig" as const,
            // One answer per line, so a sentence never runs from one answer into the next.
            text: s.turns ? s.turns.map((t) => t.answer).join("\n") : s.transcript,
            lang: s.feedback.lang,
            errors: s.feedback.improvements.map((e) => ({
              original: e.original,
              correction: e.better,
              explanation: e.explanation,
              topic: e.topic ?? "annet",
            })),
          },
        ]
      : [],
  );
  return [...written, ...spoken];
}

/** Every error from the learner's feedback as an exercise, newest first, without repeats. */
export function collectDrills(state: AppState): Drill[] {
  const seen = new Set<string>();
  const drills: Drill[] = [];
  for (const sub of sources(state)) {
    const located = locateErrors(sub.text, sub.errors);
    const spans = located.filter((e) => e.start >= 0).sort((a, b) => a.start - b.start);
    for (const e of located) {
      const original = e.original.trim();
      const correction = e.correction.trim();
      const same = `${original.toLowerCase()}→${correction.toLowerCase()}`;
      if (!original || !correction || original === correction || seen.has(same)) continue;
      seen.add(same);
      const reorder = isReorder(original, correction);
      drills.push({
        id: `feil:${hash(`${sub.id}|${original}|${correction}`)}`,
        topic: e.topic,
        original,
        correction,
        explanation: e.explanation,
        lang: sub.lang,
        ...context(
          sub.text,
          e,
          spans.filter((o) => o !== e),
        ),
        reorder,
        writable: !reorder && TYPED_TOPICS.has(e.topic) && splitWords(correction).length <= 3,
        submissionId: sub.id,
        taskId: sub.taskId,
        source: sub.source,
      });
    }
  }
  return drills;
}

/** Recognise first, then recall: once chosen right, a short correction is typed. */
export function drillKind(drill: Drill, srs: SrsState | undefined): DrillKind {
  if (drill.reorder) return "order";
  return drill.writable && (srs?.reps ?? 0) > 0 ? "write" : "choose";
}

/** Whether a typed answer matches the correction; case counts only when case was the error. */
export function matches(answer: string, drill: Drill): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").replace(/[.,!?]+$/, "");
  const caseOnly = drill.original.toLowerCase() === drill.correction.toLowerCase();
  const [a, b] = [norm(answer), norm(drill.correction)];
  return caseOnly ? a === b : a.toLowerCase() === b.toLowerCase();
}

/** A shuffle that is the same every time for a drill and never the right order. */
export function shuffled(drill: Drill): string[] {
  const target = splitWords(drill.correction);
  let seed = parseInt(drill.id.slice(5), 36) || 1;
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 2 ** 32;
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const out = [...target];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.join(" ") !== target.join(" ")) return out;
  }
  return [...target.slice(1), target[0]];
}

/** The two options to choose from, in an order fixed per drill. */
export function options(drill: Drill): [string, string] {
  return parseInt(drill.id.slice(-1), 36) % 2 ? [drill.original, drill.correction] : [drill.correction, drill.original];
}
