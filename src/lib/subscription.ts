import "server-only";
import { ensureSchema, sql } from "./db";
import type { PlanId } from "./plans";

/** The user's active subscription plan, or null. */
export async function activePlan(userId: string): Promise<PlanId | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT plan FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())`;
  return (rows[0]?.plan as PlanId | undefined) ?? null;
}
