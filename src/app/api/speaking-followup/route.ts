import { getSpeakingTask } from "@/content/speaking";
import { fail, withAiLimits } from "@/lib/ai-route";
import { followUpQuestion, parseTurns } from "@/lib/speaking-ai";

export const maxDuration = 60;

/** The AI examiner's follow-up question to the candidate's last answer. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; turns?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const task = typeof body.taskId === "string" ? getSpeakingTask(body.taskId) : undefined;
  if (!task) return fail("Fant ikke oppgaven.", 400);
  const turns = parseTurns(body.turns);
  if (!turns) return fail("Ugyldige svar.", 400);

  return withAiLimits("followup", async (onUsage) => ({ question: await followUpQuestion(task, turns, onUsage) }), {
    premium: true,
  });
}
