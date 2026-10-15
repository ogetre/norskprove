import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { getWritingTask } from "@/content/writing";
import { authEnabled } from "@/lib/auth-config";
import { ensureSchema, sql } from "@/lib/db";
import { planHasAiFeedback } from "@/lib/plans";
import { activePlan } from "@/lib/subscription";
import { assessWriting, FeedbackRefused } from "@/lib/writing-ai";
import { countWords } from "@/lib/writing-checks";

export const maxDuration = 120;

/** AI checks per user per day; each costs well under a cent. */
const DAILY_LIMIT = 30;
const MAX_CHARS = 6000;
// Locally the feature can be tried without signing in or a Premium plan.
const isDev = process.env.NODE_ENV === "development";

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
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
  if (countWords(text) < 5) return fail("Teksten er for kort til å vurderes.", 400);
  if (text.length > MAX_CHARS) return fail("Teksten er for lang til å vurderes.", 413);

  if (userId) {
    await ensureSchema();
    const used = await sql()`
      INSERT INTO ai_usage (user_id, day, requests) VALUES (${userId}, current_date, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
      WHERE ai_usage.requests < ${DAILY_LIMIT}
      RETURNING requests`;
    if (used.length === 0) {
      return fail(`Du har brukt alle ${DAILY_LIMIT} AI-tilbakemeldingene for i dag. Prøv igjen i morgen.`, 429);
    }
  }

  try {
    const { feedback, usage } = await assessWriting(task, text);
    if (userId) {
      await sql()`
        UPDATE ai_usage
        SET input_tokens = input_tokens + ${usage.input}, output_tokens = output_tokens + ${usage.output}
        WHERE user_id = ${userId} AND day = current_date`;
    }
    return Response.json({ feedback });
  } catch (err) {
    // A failed check does not count towards the daily limit.
    if (userId) {
      await sql()`
        UPDATE ai_usage SET requests = GREATEST(requests - 1, 0)
        WHERE user_id = ${userId} AND day = current_date`.catch(() => undefined);
    }
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
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return fail("AI-tilbakemelding er ikke satt opp riktig.", 503);
    }
    return fail("Noe gikk galt med AI-tilbakemeldingen. Prøv igjen.", 502);
  }
}
