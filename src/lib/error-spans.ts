import type { WritingFeedback } from "./types";

export type LocatedError = WritingFeedback["errors"][number] & {
  /** Number shown in the text and the list, from 1. */
  n: number;
  /** Position in the text, or -1 when the words could not be found. */
  start: number;
  end: number;
};

/**
 * Finds where each error is in the text. Errors are matched in order, so a phrase
 * that occurs twice is matched to the next unused occurrence. Errors that cannot
 * be found are kept, numbered after the others.
 */
export function locateErrors(text: string, errors: WritingFeedback["errors"]): LocatedError[] {
  const lower = text.toLowerCase();
  const taken: [number, number][] = [];
  const free = (s: number, e: number) => taken.every(([a, b]) => e <= a || s >= b);

  const find = (haystack: string, needle: string, from: number) => {
    let i = haystack.indexOf(needle, from);
    while (i >= 0 && !free(i, i + needle.length)) i = haystack.indexOf(needle, i + 1);
    return i;
  };

  let cursor = 0;
  const found = errors.map((e) => {
    const len = e.original.length;
    let start = -1;
    for (const [haystack, needle] of [
      [text, e.original],
      [lower, e.original.toLowerCase()],
    ]) {
      start = find(haystack, needle, cursor);
      if (start < 0) start = find(haystack, needle, 0);
      if (start >= 0) break;
    }
    if (start >= 0) {
      taken.push([start, start + len]);
      cursor = start + len;
    }
    return { ...e, start, end: start < 0 ? -1 : start + len };
  });

  const position = (e: { start: number }) => (e.start < 0 ? Number.MAX_SAFE_INTEGER : e.start);
  return found.sort((a, b) => position(a) - position(b)).map((e, i) => ({ ...e, n: i + 1 }));
}
