import "server-only";
import { randomUUID } from "node:crypto";
import { ensureSchema, sql } from "./db";
import { FREE_ORAL_CHECKS, PLAN_ORAL_CHECKS, type OralAllowance, type PlanId } from "./plans";

/*
 * AI checks of the oral test. One check is one oral test, or one practice task, heard and graded
 * by Gemini. It is taken when the learner starts, and the follow-up questions during the test and
 * the grading at the end are made for that check, so a check can't be stretched over more tasks.
 * Every signed-in learner has one free check; a plan gives a number of checks each month.
 */

/** A check is open for a day, so a test can be continued after a break. */
const OPEN_HOURS = 24;
/** Answers a check can send to Gemini: a full test has about twelve, follow-ups included. */
const MAX_ANSWERS = 40;

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** USD a day for the whole site; Google Cloud has no hard cap of its own. */
const siteDailyBudget = () => envNumber("ORAL_DAILY_BUDGET_USD", 5);

export async function oralAllowance(userId: string, plan: PlanId | null): Promise<OralAllowance> {
  await ensureSchema();
  const db = sql();
  if (!plan) {
    const [row] = await db`SELECT count(*)::int AS n FROM oral_checks WHERE user_id = ${userId} AND free`;
    return { limit: FREE_ORAL_CHECKS, used: row.n, left: Math.max(0, FREE_ORAL_CHECKS - row.n), free: true };
  }
  const limit = PLAN_ORAL_CHECKS[plan];
  const [row] = await db`
    SELECT count(*)::int AS n FROM oral_checks
    WHERE user_id = ${userId} AND NOT free AND created_at >= date_trunc('month', now())`;
  return { limit, used: row.n, left: limit === null ? null : Math.max(0, limit - row.n), free: false };
}

export type Started = { id: string; resumed: boolean } | "used-up" | "site-limit";

/**
 * Starts a check of these tasks, or continues the open one for the same tasks, which costs
 * nothing. The count is checked in the same statement as the insert.
 */
export async function startOralCheck(userId: string, plan: PlanId | null, taskIds: string[]): Promise<Started> {
  await ensureSchema();
  const db = sql();
  const [open] = await db`
    SELECT id FROM oral_checks
    WHERE user_id = ${userId} AND task_ids = ${taskIds}::text[]
      AND created_at > now() - make_interval(hours => ${OPEN_HOURS}::int)
      AND grades < cardinality(task_ids)
    ORDER BY created_at DESC LIMIT 1`;
  if (open) return { id: open.id as string, resumed: true };

  const [spent] = await db`SELECT COALESCE(SUM(cost_usd), 0) AS usd FROM oral_checks WHERE created_at >= current_date`;
  if (Number(spent.usd) >= siteDailyBudget()) return "site-limit";

  const limit = plan ? PLAN_ORAL_CHECKS[plan] : FREE_ORAL_CHECKS;
  const id = randomUUID();
  const free = plan === null;
  // A plan's checks are counted per month, the free one for all time.
  const inserted = await db`
    INSERT INTO oral_checks (id, user_id, task_ids, free)
    SELECT ${id}, ${userId}, ${taskIds}::text[], ${free}::boolean
    WHERE ${limit === null}::boolean OR (
      SELECT count(*) FROM oral_checks
      WHERE user_id = ${userId} AND free = ${free}::boolean
        AND created_at >= CASE WHEN ${free}::boolean THEN '-infinity'::timestamptz ELSE date_trunc('month', now()) END
    ) < ${limit ?? 0}::int
    RETURNING id`;
  return inserted.length ? { id, resumed: false } : "used-up";
}

/** Whether the learner has a check that is started but not graded, so a test can be continued. */
export async function hasOpenCheck(userId: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    SELECT 1 FROM oral_checks
    WHERE user_id = ${userId} AND grades < cardinality(task_ids)
      AND created_at > now() - make_interval(hours => ${OPEN_HOURS}::int)
    LIMIT 1`;
  return rows.length > 0;
}

/** The learner's open check that covers the task, or null. */
export async function openOralCheck(userId: string, id: string, taskId: string): Promise<{ id: string } | null> {
  await ensureSchema();
  const [row] = await sql()`
    SELECT id FROM oral_checks
    WHERE id = ${id} AND user_id = ${userId} AND ${taskId}::text = ANY(task_ids)
      AND created_at > now() - make_interval(hours => ${OPEN_HOURS}::int)`;
  return row ? { id: row.id as string } : null;
}

/** Counts one answer sent to Gemini; false when the check has had its share. */
export async function takeAnswer(id: string): Promise<boolean> {
  const rows = await sql()`UPDATE oral_checks SET answers = answers + 1 WHERE id = ${id} AND answers < ${MAX_ANSWERS}::int RETURNING id`;
  return rows.length > 0;
}

/** Counts one grading; each task can be graded twice, in case the first one failed. */
export async function takeGrade(id: string): Promise<boolean> {
  const rows = await sql()`
    UPDATE oral_checks SET grades = grades + 1 WHERE id = ${id} AND grades < 2 * cardinality(task_ids) RETURNING id`;
  return rows.length > 0;
}

export async function addOralCost(id: string, usd: number) {
  if (usd > 0) await sql()`UPDATE oral_checks SET cost_usd = cost_usd + ${usd}::numeric WHERE id = ${id}`;
}
