import "server-only";
import { ensureSchema, sql } from "./db";
import { PRICE_PER_TOKEN } from "./writing-ai";

/*
 * Spending limits for AI feedback. Each user gets a number of checks per day,
 * and the whole site has a daily cap on checks and on dollars, kept in the
 * ai_usage row of TOTAL. Slots are taken atomically before calling Claude, so
 * parallel requests cannot go past a limit.
 */

/** ai_usage row with the whole site's use per day; not a Clerk user id. */
const TOTAL = "_total";

export const USER_DAILY_LIMIT = 30;

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Checks per day for the whole site. */
const siteDailyLimit = () => Math.floor(envNumber("AI_DAILY_REQUESTS", 300));
/** USD per day for the whole site, from the tokens used so far. */
const siteDailyBudget = () => envNumber("AI_DAILY_BUDGET_USD", 1);

export type Reservation = "ok" | "user-limit" | "site-limit";

/** Takes one check from the user's and the site's daily allowance. */
export async function reserveCheck(userId: string): Promise<Reservation> {
  await ensureSchema();
  const db = sql();
  const user = await db`
    INSERT INTO ai_usage (user_id, day, requests) VALUES (${userId}, current_date, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
    WHERE ai_usage.requests < ${USER_DAILY_LIMIT}
    RETURNING requests`;
  if (user.length === 0) return "user-limit";

  const site = await db`
    INSERT INTO ai_usage (user_id, day, requests) VALUES (${TOTAL}, current_date, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
    WHERE ai_usage.requests < ${siteDailyLimit()}
      AND ai_usage.input_tokens * ${PRICE_PER_TOKEN.input}::numeric
        + ai_usage.output_tokens * ${PRICE_PER_TOKEN.output}::numeric < ${siteDailyBudget()}::numeric
    RETURNING requests`;
  if (site.length === 0) {
    await releaseCheck(userId, false);
    return "site-limit";
  }
  return "ok";
}

/** Adds the tokens a check used, for the user and the site. */
export async function recordTokens(userId: string, input: number, output: number) {
  await sql()`
    UPDATE ai_usage
    SET input_tokens = input_tokens + ${input}, output_tokens = output_tokens + ${output}
    WHERE day = current_date AND user_id IN (${userId}, ${TOTAL})`;
}

/** Gives a check back when Claude was never reached, so nothing was billed. */
export async function releaseCheck(userId: string, site = true) {
  await sql()`
    UPDATE ai_usage SET requests = GREATEST(requests - 1, 0)
    WHERE day = current_date AND user_id IN (${userId}, ${site ? TOTAL : userId})`;
}
