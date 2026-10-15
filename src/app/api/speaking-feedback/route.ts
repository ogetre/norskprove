import { getSpeakingTask } from "@/content/speaking";
import { fail, withAiLimits } from "@/lib/ai-route";
import { isLanguage } from "@/lib/languages";
import { assessSpeaking, parseTurns } from "@/lib/speaking-ai";
import { countWords } from "@/lib/writing-checks";

export const maxDuration = 120;

/** AI assessment of the spoken answers to one task: level, criteria and better phrasing. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; turns?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const task = typeof body.taskId === "string" ? getSpeakingTask(body.taskId) : undefined;
  if (!task) return fail("Fant ikke oppgaven.", 400);
  const turns = parseTurns(body.turns);
  if (!turns) return fail("Ugyldige svar.", 400);
  if (countWords(turns.map((t) => t.answer).join(" ")) < 5) return fail("Svarene er for korte til å vurderes.", 400);
  const lang = isLanguage(body.lang) ? body.lang : null;

  return withAiLimits("speaking", async (onUsage) => ({ feedback: await assessSpeaking(task, turns, lang, onUsage) }), {
    premium: true,
  });
}
