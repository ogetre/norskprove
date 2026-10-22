import { auth } from "@clerk/nextjs/server";
import { ACTIVITY_MODES, ACTIVITY_SKILLS } from "@/lib/activity";
import { authEnabled } from "@/lib/auth-config";
import { ensureSchema, sql } from "@/lib/db";
import type { Mode, Skill } from "@/lib/types";

/** A count per day, part and mode stops growing here, so a script can't blow up the statistics. */
const DAILY_CAP = 5000;

/** One solved task, counted without anything about who solved it. */
export async function POST(req: Request) {
  const body = (await req.text().then((t) => JSON.parse(t), () => null).catch(() => null)) as {
    skill?: unknown;
    mode?: unknown;
  } | null;
  const skill = body?.skill as Skill;
  const mode = body?.mode as Mode;
  if (!ACTIVITY_SKILLS.includes(skill) || !ACTIVITY_MODES.includes(mode)) return new Response(null, { status: 400 });
  const account = authEnabled ? Boolean((await auth()).userId) : false;
  try {
    await ensureSchema();
    await sql()`
      INSERT INTO activity (day, skill, mode, account, n)
      VALUES ((now() AT TIME ZONE 'Europe/Oslo')::date, ${skill}, ${mode}, ${account}::boolean, 1)
      ON CONFLICT (day, skill, mode, account) DO UPDATE SET n = activity.n + 1
      WHERE activity.n < ${DAILY_CAP}::int`;
  } catch (err) {
    console.error("activity count failed", err);
  }
  return new Response(null, { status: 204 });
}
