import { getSpeakingTask } from "@/content/speaking";
import { fail } from "@/lib/ai-route";
import { hasOpenCheck, oralAllowance, startOralCheck } from "@/lib/oral-checks";
import { oralUser } from "@/lib/oral-route";
import { oralQuota } from "@/lib/plans";
import { vertexReady } from "@/lib/vertex";

/** Whether AI checks of the oral test work, how many the learner has left, and whether one is open. */
export async function GET() {
  const user = await oralUser();
  if (user instanceof Response) return user;
  const available = vertexReady() || Boolean(process.env.ANTHROPIC_API_KEY);
  const [allowance, open] = await Promise.all([oralAllowance(user.userId, user.plan), hasOpenCheck(user.userId)]);
  return Response.json({ available, heard: vertexReady(), allowance, open });
}

/** Starts an AI check of these tasks, or continues the open one for the same tasks. */
export async function POST(req: Request) {
  const user = await oralUser();
  if (user instanceof Response) return user;
  const body = (await req.json().catch(() => null)) as { taskIds?: unknown } | null;
  const ids = body?.taskIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 6 || !ids.every((id) => typeof id === "string" && getSpeakingTask(id))) {
    return fail("Ukjente oppgaver.", 400);
  }
  if (!vertexReady() && !process.env.ANTHROPIC_API_KEY) return fail("AI er ikke satt opp ennå.", 503);

  const started = await startOralCheck(user.userId, user.plan, ids as string[]);
  if (started === "site-limit") return fail("AI-vurderingen er stengt resten av dagen. Prøv igjen i morgen.", 503);
  if (started === "used-up") {
    return fail(
      oralQuota(user.plan).free
        ? "Du har brukt den gratis AI-vurderingen din."
        : "Du har brukt AI-vurderingene dine denne måneden. Du får nye neste måned.",
      403,
    );
  }
  return Response.json({ ...started, allowance: await oralAllowance(user.userId, user.plan) });
}
