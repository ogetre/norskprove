import "server-only";
import { content } from "@/content";
import { isListening, type ExamTask } from "./types";

const tasks = new Map<string, ExamTask>(
  [...(content.lesing?.tasks ?? []), ...(content.lytting?.tasks ?? [])].map((t) => [t.id, t]),
);

/** A paragraph of a reading text or a line of a recording, by task and position. */
export function textBlock(taskId: unknown, block: unknown): string | null {
  if (typeof taskId !== "string" || typeof block !== "number" || !Number.isInteger(block) || block < 0) return null;
  const task = tasks.get(taskId);
  if (!task) return null;
  return (isListening(task) ? task.lines[block]?.text : task.paragraphs[block]) ?? null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The sentence of `text` that contains `word` as a whole word, or null. */
export function sentenceWith(text: string, word: string): string | null {
  const whole = new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, "iu");
  return (
    text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .find((s) => whole.test(s)) ?? null
  );
}
