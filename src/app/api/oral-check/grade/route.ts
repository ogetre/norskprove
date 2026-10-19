import { getSpeakingTask } from "@/content/speaking";
import { fail } from "@/lib/ai-route";
import { recordTokens, reserveCheck } from "@/lib/ai-usage";
import { isLanguage } from "@/lib/languages";
import { gradeTask, type GradeItem } from "@/lib/oral-ai";
import { addOralCost, openOralCheck, takeGrade } from "@/lib/oral-checks";
import { oralUser, recordingFrom } from "@/lib/oral-route";
import { assessSpeaking } from "@/lib/speaking-ai";
import { vertexReady } from "@/lib/vertex";
import { countWords } from "@/lib/writing-checks";

export const maxDuration = 120;

type SentTurn = { question: string; followUp: boolean; text: string };

/** The questions of a task as sent: 1–12, each with what the browser heard. */
function parseSent(value: unknown): SentTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) return null;
  const turns: SentTurn[] = [];
  for (const t of value as Partial<SentTurn>[]) {
    if (typeof t?.question !== "string" || typeof t.text !== "string") return null;
    if (t.question.length > 400 || t.text.length > 3000) return null;
    turns.push({ question: t.question.trim(), followUp: t.followUp === true, text: t.text.trim() });
  }
  return turns;
}

/**
 * Grades one task of a checked oral test. Gemini hears all its recordings and also assesses
 * pronunciation; without Gemini, or if it fails, Claude grades the transcripts.
 */
export async function POST(req: Request) {
  const user = await oralUser();
  if (user instanceof Response) return user;
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Ugyldig skjema.", 400);

  const task = getSpeakingTask(String(form.get("taskId") ?? ""));
  if (!task) return fail("Fant ikke oppgaven.", 400);
  let sent: SentTurn[] | null = null;
  try {
    sent = parseSent(JSON.parse(String(form.get("turns") ?? "")));
  } catch {
    sent = null;
  }
  if (!sent) return fail("Ugyldige svar.", 400);
  const langValue = form.get("lang");
  const lang = isLanguage(langValue) ? langValue : null;

  const check = await openOralCheck(user.userId, String(form.get("checkId") ?? ""), task.id);
  if (!check) return fail("AI-vurderingen er utløpt. Start prøven på nytt.", 403);
  if (!(await takeGrade(check.id))) return fail("Denne oppgaven er allerede vurdert.", 429);

  const items: GradeItem[] = await Promise.all(
    sent.map(async (t, i) => ({ ...t, recording: await recordingFrom(form.get(`audio_${i}`)) })),
  );
  if (vertexReady() && items.some((i) => i.recording)) {
    try {
      const { transcripts, ...feedback } = await gradeTask(task, items, lang, (usd) => addOralCost(check.id, usd));
      return Response.json({ feedback, transcripts });
    } catch (err) {
      console.error("oral grading failed", err);
    }
  }

  // Claude, on what the browser heard.
  const turns = items.map((i) => ({ question: i.question, answer: i.text }));
  if (countWords(turns.map((t) => t.answer).join(" ")) < 5) return fail("Svarene er for korte til å vurderes.", 400);
  if (!process.env.ANTHROPIC_API_KEY || (await reserveCheck(user.userId, "speaking")) !== "ok") {
    return fail("AI-vurderingen er ikke tilgjengelig akkurat nå. Prøv igjen om litt.", 503);
  }
  try {
    const feedback = await assessSpeaking(task, turns, lang, (input, output) => recordTokens(user.userId, input, output, "speaking"));
    return Response.json({ feedback });
  } catch (err) {
    console.error("oral grading fallback failed", err);
    return fail("AI-vurderingen er ikke tilgjengelig akkurat nå. Prøv igjen om litt.", 503);
  }
}
