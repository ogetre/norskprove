import manifest from "@/content/listening/narration.json";

/*
 * What the listening exam reads aloud besides the tasks: the instructions before each part and
 * the questions. Each text is recorded once (npm run audio:narration) and found by a key made
 * from the text itself, so a changed text is never played with an old recording.
 */

const clips = new Set((manifest as { clips: string[] }).clips);
const voices = encodeURIComponent((manifest as { voices: string | null }).voices ?? "");

/** FNV-1a of the text in base 36. */
export function narrationKey(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The recording of the text, or null when it isn't recorded. */
export function narrationUrl(text: string): string | null {
  const key = narrationKey(text);
  return clips.has(key) ? `/audio/opplesning/${key}.mp3?v=${voices}` : null;
}
