import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { recordTokens, releaseCheck, reserveCheck, userDailyLimit, type AiKind } from "./ai-usage";
import { authEnabled } from "./auth-config";
import { Refused } from "./claude";
import { planHasAiFeedback } from "./plans";
import { activePlan } from "./subscription";

// Locally the AI features can be tried without signing in.
const isDev = process.env.NODE_ENV === "development";

export function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * True when Claude returned no answer, so nothing was billed. A timeout may still have
 * been billed; a refusal or an unusable answer was.
 */
function notBilled(err: unknown): boolean {
  return err instanceof Anthropic.APIError && !(err instanceof Anthropic.APIConnectionTimeoutError);
}

/**
 * Runs one AI request for a signed-in learner within the daily limits, and turns the
 * outcome into a response. `run` gets a callback that records the tokens Claude billed.
 */
export async function withAiLimits(
  kind: AiKind,
  run: (onUsage: (input: number, output: number) => Promise<void>) => Promise<object>,
  { premium = false }: { premium?: boolean } = {},
): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return fail("AI er ikke satt opp ennå.", 503);

  const userId = authEnabled ? (await auth()).userId : null;
  if (!userId && !isDev) return fail("Logg inn for å bruke dette.", 401);
  if (premium && userId && !isDev && !planHasAiFeedback(await activePlan(userId))) {
    return fail("AI-tilbakemelding er med i Premium.", 403);
  }

  if (userId) {
    const reserved = await reserveCheck(userId, kind);
    if (reserved === "user-limit") {
      return fail(`Du har nådd grensen på ${userDailyLimit(kind)} for i dag. Prøv igjen i morgen.`, 429);
    }
    if (reserved === "site-limit") return fail("AI er stengt resten av dagen. Prøv igjen i morgen.", 503);
  }

  try {
    const body = await run(async (input, output) => {
      if (userId) await recordTokens(userId, input, output, kind).catch((e) => console.error("ai_usage update failed", e));
    });
    return Response.json(body);
  } catch (err) {
    if (userId && notBilled(err)) await releaseCheck(userId, kind).catch(() => undefined);
    if (err instanceof Refused) return fail("Dette kunne ikke behandles. Prøv noe annet.", 422);
    if (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      return fail("AI er opptatt akkurat nå. Prøv igjen om litt.", 503);
    }
    console.error(`${kind} failed`, err);
    if (err instanceof Anthropic.APIError) return fail("AI er midlertidig utilgjengelig.", 503);
    return fail("Noe gikk galt. Prøv igjen.", 502);
  }
}
