import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { getWritingTask } from "@/content/writing";
import { releaseCheck, recordTokens, reserveCheck, USER_DAILY_LIMIT } from "@/lib/ai-usage";
import { authEnabled } from "@/lib/auth-config";
import { planHasAiFeedback } from "@/lib/plans";
import { activePlan } from "@/lib/subscription";
import { assessWriting, FeedbackRefused } from "@/lib/writing-ai";
import { countWords } from "@/lib/writing-checks";

// Claude takes 15–30 s; one retry after a timeout has to fit too.
export const maxDuration = 160;

const MAX_CHARS = 4000;
// Locally the feature can be tried without signing in or a Premium plan.
const isDev = process.env.NODE_ENV === "development";

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * True when Claude returned no answer, so nothing was billed. A timeout may still have
 * been billed; a refusal or an unusable answer was.
 */
function notBilled(err: unknown): boolean {
  return err instanceof Anthropic.APIError && !(err instanceof Anthropic.APIConnectionTimeoutError);
}

/** AI feedback on a written answer: errors with corrections, criteria and an estimated level. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return fail("AI-tilbakemelding er ikke satt opp ennå.", 503);

  const userId = authEnabled ? (await auth()).userId : null;
  if (!userId && !isDev) return fail("Logg inn for å få AI-tilbakemelding.", 401);
  if (userId && !isDev && !planHasAiFeedback(await activePlan(userId))) {
    return fail("AI-tilbakemelding er med i Premium.", 403);
  }

  let body: { taskId?: unknown; text?: unknown };
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

  if (userId) {
    const reserved = await reserveCheck(userId);
    if (reserved === "user-limit") {
      return fail(`Du har brukt alle ${USER_DAILY_LIMIT} AI-tilbakemeldingene for i dag. Prøv igjen i morgen.`, 429);
    }
    if (reserved === "site-limit") {
      return fail("AI-tilbakemelding er stengt resten av dagen. Prøv igjen i morgen.", 503);
    }
  }

  try {
    const feedback = await assessWriting(task, text, async (input, output) => {
      // The answer is paid for, so a failed write must not cost the user their feedback.
      if (userId) await recordTokens(userId, input, output).catch((e) => console.error("ai_usage update failed", e));
    });
    return Response.json({ feedback });
  } catch (err) {
    // Only a check that cost nothing is given back; otherwise failing answers could be repeated for free.
    if (userId && notBilled(err)) await releaseCheck(userId).catch(() => undefined);
    if (err instanceof FeedbackRefused) {
      return fail("AI-sensoren kunne ikke vurdere denne teksten. Endre teksten litt og prøv igjen.", 422);
    }
    if (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      return fail("AI-sensoren er opptatt akkurat nå. Prøv igjen om litt.", 503);
    }
    console.error("writing-feedback failed", err);
    // Also an empty credit balance or a revoked key.
    if (err instanceof Anthropic.APIError) return fail("AI-tilbakemelding er midlertidig utilgjengelig.", 503);
    return fail("Noe gikk galt med AI-tilbakemeldingen. Prøv igjen.", 502);
  }
}
