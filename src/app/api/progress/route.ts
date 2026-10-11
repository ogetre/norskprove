import { auth } from "@clerk/nextjs/server";
import { ensureSchema, sql } from "@/lib/db";

const MAX_BYTES = 2_000_000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Du er ikke logget inn." }, { status: 401 });

  await ensureSchema();
  const rows = await sql()`SELECT state, updated_at FROM progress WHERE user_id = ${userId}`;
  if (rows.length === 0) return Response.json({ state: null });
  return Response.json({ state: rows[0].state, updatedAt: rows[0].updated_at });
}

async function save(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Du er ikke logget inn." }, { status: 401 });

  const body = await req.text();
  if (body.length > MAX_BYTES) {
    return Response.json({ error: "Fremgangen er for stor til å lagres." }, { status: 413 });
  }

  let state: unknown;
  try {
    state = JSON.parse(body).state;
  } catch {
    return Response.json({ error: "Ugyldig JSON." }, { status: 400 });
  }
  if (
    typeof state !== "object" ||
    state === null ||
    (state as { version?: unknown }).version !== 1 ||
    !Array.isArray((state as { attempts?: unknown }).attempts)
  ) {
    return Response.json({ error: "Ugyldig fremgang." }, { status: 400 });
  }

  await ensureSchema();
  await sql()`
    INSERT INTO progress (user_id, state, updated_at)
    VALUES (${userId}, ${JSON.stringify(state)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`;
  return Response.json({ ok: true });
}

export const PUT = save;
// sendBeacon can only POST; used to flush unsaved progress when the tab closes.
export const POST = save;
