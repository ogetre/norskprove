import { cacheGet, cachePut, hashKey } from "@/lib/ai-cache";
import { fail, withAiLimits } from "@/lib/ai-route";
import { isLanguage } from "@/lib/languages";
import { textBlock } from "@/lib/text-blocks";
import { translateText } from "@/lib/word-ai";

export const maxDuration = 60;

/** A paragraph of a reading text or a line of a recording in the learner's language. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; block?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const { taskId, block, lang } = body;
  if (!isLanguage(lang)) return fail("Ukjent språk.", 400);
  const text = textBlock(taskId, block);
  if (!text) return fail("Fant ikke teksten.", 400);

  const key = hashKey("translate:v1", lang, text);
  const cached = await cacheGet<string>(key);
  if (cached) return Response.json({ translation: cached });

  return withAiLimits("translate", async (onUsage) => {
    const translation = await translateText({ text, lang }, onUsage);
    await cachePut(key, translation).catch((e) => console.error("ai_cache write failed", e));
    return { translation };
  });
}
