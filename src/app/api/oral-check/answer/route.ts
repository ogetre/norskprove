import { getSpeakingTask } from "@/content/speaking";
import { fail } from "@/lib/ai-route";
import { recordTokens, reserveCheck } from "@/lib/ai-usage";
import { hearAnswer } from "@/lib/oral-ai";
import { addOralCost, openOralCheck, takeAnswer } from "@/lib/oral-checks";
import { oralUser, recordingFrom } from "@/lib/oral-route";
import { followUpQuestion, parseTurns, type Turn } from "@/lib/speaking-ai";
import { vertexReady } from "@/lib/vertex";
import { countWords } from "@/lib/writing-checks";

export const maxDuration = 60;

/**
 * One answer in a checked oral test: what Gemini heard in the recording, and the examiner's
 * follow-up when one is wanted. Without Gemini the browser's transcript is kept and Claude asks.
 */
export async function POST(req: Request) {
  const user = await oralUser();
  if (user instanceof Response) return user;
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Ugyldig skjema.", 400);

  const task = getSpeakingTask(String(form.get("taskId") ?? ""));
  const question = String(form.get("question") ?? "").trim();
  if (!task || !question || question.length > 400) return fail("Ugyldig spørsmål.", 400);
  const earlierRaw = String(form.get("earlier") ?? "[]");
  let earlier: Turn[] = [];
  try {
    const value: unknown = JSON.parse(earlierRaw);
    earlier = Array.isArray(value) && value.length ? (parseTurns(value) ?? []) : [];
  } catch {
    return fail("Ugyldige svar.", 400);
  }
  const browserText = String(form.get("text") ?? "").slice(0, 3000).trim();
  const wantFollowUp = form.get("followUp") === "1";

  const check = await openOralCheck(user.userId, String(form.get("checkId") ?? ""), task.id);
  if (!check) return fail("AI-vurderingen er utløpt. Start prøven på nytt.", 403);
  if (!(await takeAnswer(check.id))) return fail("Denne vurderingen har fått for mange svar.", 429);

  let transcript = browserText;
  let followUp: string | null = null;
  let heard = false;
  const recording = await recordingFrom(form.get("audio"));
  if (recording && vertexReady()) {
    try {
      const r = await hearAnswer(task, earlier, question, recording, wantFollowUp, (usd) => addOralCost(check.id, usd));
      transcript = r.transcript || browserText;
      followUp = r.followUp;
      heard = true;
    } catch (err) {
      console.error("oral answer failed", err);
    }
  }
  if (wantFollowUp && !followUp && process.env.ANTHROPIC_API_KEY && countWords(transcript) >= 3) {
    if ((await reserveCheck(user.userId, "followup")) === "ok") {
      followUp = await followUpQuestion(task, [...earlier, { question, answer: transcript }], (input, output) =>
        recordTokens(user.userId, input, output, "followup"),
      ).catch(() => null);
    }
  }
  return Response.json({ transcript, followUp, heard });
}
