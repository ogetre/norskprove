import { auth } from "@clerk/nextjs/server";
import { fail } from "@/lib/ai-route";
import { authEnabled } from "@/lib/auth-config";
import { ensureSchema, sql } from "@/lib/db";

/** More reports than this in a day is a script, not learners. */
const DAILY_CAP = 300;

/** An error a learner found in a task, for the owner to fix. Works without an account. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { path?: unknown; taskId?: unknown; message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const path = typeof body?.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : "";
  const taskId = typeof body?.taskId === "string" ? body.taskId.slice(0, 100) : null;
  if (message.length < 3 || message.length > 1500 || !path) return fail("Skriv hva som er feil.", 400);
  const userId = authEnabled ? (await auth()).userId : null;

  await ensureSchema();
  const inserted = await sql()`
    INSERT INTO reports (user_id, path, task_id, message)
    SELECT ${userId}, ${path}, ${taskId}, ${message}
    WHERE (SELECT count(*) FROM reports WHERE created_at > now() - interval '1 day') < ${DAILY_CAP}::int
    RETURNING id`;
  if (inserted.length === 0) return fail("Vi tar ikke imot flere meldinger i dag. Prøv igjen i morgen.", 429);
  return Response.json({ ok: true });
}
