import { cacheGet, cachePut, hashKey } from "@/lib/ai-cache";
import { fail, withAiLimits } from "@/lib/ai-route";
import { isLanguage } from "@/lib/languages";
import { sentenceWith, textBlock } from "@/lib/text-blocks";
import type { WordEntry } from "@/lib/types";
import { lookupWord } from "@/lib/word-ai";

export const maxDuration = 60;

/** A word in a reading text or recording, explained in the learner's language. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; block?: unknown; word?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const { taskId, block, word, lang } = body;
  if (!isLanguage(lang)) return fail("Ukjent språk.", 400);
  if (typeof word !== "string" || !/^[\p{L}][\p{L}'’-]{0,39}$/u.test(word)) return fail("Ugyldig ord.", 400);
  const text = textBlock(taskId, block);
  if (!text) return fail("Fant ikke teksten.", 400);
  // Only words from the site's own texts, so the cost is bounded by the texts.
  const sentence = sentenceWith(text, word);
  if (!sentence) return fail("Fant ikke ordet i teksten.", 400);

  const key = hashKey("lookup:v1", lang, word.toLowerCase(), sentence);
  const cached = await cacheGet<WordEntry>(key);
  if (cached) return Response.json({ entry: cached });

  return withAiLimits("lookup", async (onUsage) => {
    const entry = await lookupWord({ word, sentence, lang }, onUsage);
    await cachePut(key, entry).catch((e) => console.error("ai_cache write failed", e));
    return { entry };
  });
}
