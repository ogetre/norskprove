import "server-only";
import { PRICE_PER_TOKEN } from "./claude";
import { ensureSchema, sql } from "./db";

/*
 * Spending limits for the AI features. Each kind of request has a daily number per user
 * and for the whole site, and the whole site has one daily budget in dollars. Slots are
 * taken atomically before calling Claude, so parallel requests cannot go past a limit.
 *
 * ai_usage rows: the user id (writing feedback) or "<user id>:<kind>", and "_total"
 * (writing feedback) or "_total:<kind>" for the whole site.
 */

export type AiKind = "feedback" | "lookup" | "translate";

const TOTAL = "_total";

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const LIMITS: Record<AiKind, { user: number; site: () => number }> = {
  feedback: { user: 30, site: () => Math.floor(envNumber("AI_DAILY_REQUESTS", 300)) },
  // Answers are cached for everyone, so most taps cost nothing.
  lookup: { user: 300, site: () => 5000 },
  translate: { user: 100, site: () => 2000 },
};

export const USER_DAILY_LIMIT = LIMITS.feedback.user;

export function userDailyLimit(kind: AiKind): number {
  return LIMITS[kind].user;
}

/** USD per day for the whole site, from the tokens used so far. */
const siteDailyBudget = () => envNumber("AI_DAILY_BUDGET_USD", 1);

const userRow = (userId: string, kind: AiKind) => (kind === "feedback" ? userId : `${userId}:${kind}`);
const siteRow = (kind: AiKind) => (kind === "feedback" ? TOTAL : `${TOTAL}:${kind}`);

export type Reservation = "ok" | "user-limit" | "site-limit";

/** Takes one request from the user's and the site's daily allowance. */
export async function reserveCheck(userId: string, kind: AiKind = "feedback"): Promise<Reservation> {
  await ensureSchema();
  const db = sql();

  const [spent] = await db`
    SELECT COALESCE(SUM(input_tokens * ${PRICE_PER_TOKEN.input}::numeric
      + output_tokens * ${PRICE_PER_TOKEN.output}::numeric), 0) AS usd
    FROM ai_usage WHERE day = current_date AND starts_with(user_id, ${TOTAL})`;
  if (Number(spent.usd) >= siteDailyBudget()) return "site-limit";

  const user = await db`
    INSERT INTO ai_usage (user_id, day, requests) VALUES (${userRow(userId, kind)}, current_date, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
    WHERE ai_usage.requests < ${LIMITS[kind].user}
    RETURNING requests`;
  if (user.length === 0) return "user-limit";

  const site = await db`
    INSERT INTO ai_usage (user_id, day, requests) VALUES (${siteRow(kind)}, current_date, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
    WHERE ai_usage.requests < ${LIMITS[kind].site()}
    RETURNING requests`;
  if (site.length === 0) {
    await releaseCheck(userId, kind, false);
    return "site-limit";
  }
  return "ok";
}

/** Adds the tokens a request used, for the user and the site. */
export async function recordTokens(userId: string, input: number, output: number, kind: AiKind = "feedback") {
  await sql()`
    UPDATE ai_usage
    SET input_tokens = input_tokens + ${input}, output_tokens = output_tokens + ${output}
    WHERE day = current_date AND user_id IN (${userRow(userId, kind)}, ${siteRow(kind)})`;
}

/** Gives a request back when Claude was never reached, so nothing was billed. */
export async function releaseCheck(userId: string, kind: AiKind = "feedback", site = true) {
  await sql()`
    UPDATE ai_usage SET requests = GREATEST(requests - 1, 0)
    WHERE day = current_date AND user_id IN (${userRow(userId, kind)}, ${site ? siteRow(kind) : userRow(userId, kind)})`;
}
