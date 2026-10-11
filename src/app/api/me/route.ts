import { auth } from "@clerk/nextjs/server";
import { authEnabled } from "@/lib/auth-config";
import { ensureSchema, sql } from "@/lib/db";
import type { PlanId } from "@/lib/plans";

/** The signed-in user's active subscription plan, or null. */
export async function GET() {
  if (!authEnabled) return Response.json({ plan: null, signedIn: false });
  const { userId } = await auth();
  if (!userId) return Response.json({ plan: null, signedIn: false });

  await ensureSchema();
  const rows = await sql()`
    SELECT plan FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())`;
  const plan = (rows[0]?.plan as PlanId | undefined) ?? null;
  return Response.json({ plan, signedIn: true });
}
