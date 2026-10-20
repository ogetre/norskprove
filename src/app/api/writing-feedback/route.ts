import { auth } from "@clerk/nextjs/server";
import { getWritingTask } from "@/content/writing";
import { fail, withAiLimits, writingAllowance } from "@/lib/ai-route";
import { authEnabled } from "@/lib/auth-config";
import { isLanguage } from "@/lib/languages";
import { activePlan } from "@/lib/subscription";
import { assessWriting } from "@/lib/writing-ai";
import { countWords } from "@/lib/writing-checks";

// Claude takes 15–30 s; one retry after a timeout has to fit too.
export const maxDuration = 160;

const MAX_CHARS = 4000;

/** AI feedback on a written answer: errors with corrections, criteria and an estimated level. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; text?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const task = typeof body.taskId === "string" ? getWritingTask(body.taskId) : undefined;
  if (!task) return fail("Fant ikke oppgaven.", 400);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const words = countWords(text);
  if (words < 5) return fail("Teksten er for kort til å vurderes.", 400);
  if (text.length > MAX_CHARS || words > task.maxWords * 2) {
    return fail(`Teksten er for lang til å vurderes. Hold deg under ${task.maxWords * 2} ord.`, 413);
  }
  const lang = isLanguage(body.lang) ? body.lang : null;

  return withAiLimits("feedback", async (onUsage) => ({ feedback: await assessWriting(task, text, lang, onUsage) }), {
    premium: true,
    monthly: true,
  });
}

/** How many texts the learner can still have graded this month. */
export async function GET() {
  const userId = authEnabled ? (await auth()).userId : null;
  if (!userId) return fail("Logg inn for å bruke dette.", 401);
  return Response.json({ allowance: await writingAllowance(userId, await activePlan(userId)) });
}
