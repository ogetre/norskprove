import { getWritingTask } from "@/content/writing";
import { fail, withAiLimits } from "@/lib/ai-route";
import { recheckWriting } from "@/lib/writing-ai";
import { countWords } from "@/lib/writing-checks";

export const maxDuration = 120;

const MAX_CHARS = 4000;

type ErrorIn = { original: string; correction: string; explanation: string };

function isError(e: unknown): e is ErrorIn {
  const x = e as Partial<ErrorIn> | null;
  return (
    typeof x?.original === "string" &&
    typeof x.correction === "string" &&
    typeof x.explanation === "string" &&
    x.original.length + x.correction.length + x.explanation.length <= 600
  );
}

/** Checks the learner's own corrections of the errors their feedback marked. */
export async function POST(req: Request) {
  let body: { taskId?: unknown; original?: unknown; revised?: unknown; errors?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Ugyldig JSON.", 400);
  }
  const task = typeof body.taskId === "string" ? getWritingTask(body.taskId) : undefined;
  if (!task) return fail("Fant ikke oppgaven.", 400);
  const original = typeof body.original === "string" ? body.original.trim() : "";
  const revised = typeof body.revised === "string" ? body.revised.trim() : "";
  if (countWords(revised) < 5 || !original) return fail("Teksten er for kort.", 400);
  if (original.length > MAX_CHARS || revised.length > MAX_CHARS) return fail("Teksten er for lang.", 413);
  if (!Array.isArray(body.errors) || body.errors.length === 0 || body.errors.length > 25 || !body.errors.every(isError)) {
    return fail("Ugyldig liste over feil.", 400);
  }
  const errors = body.errors;

  return withAiLimits(
    "recheck",
    async (onUsage) => ({ check: await recheckWriting(task, { original, revised, errors }, onUsage) }),
    { premium: true },
  );
}
