import { auth } from "@clerk/nextjs/server";
import { fail } from "@/lib/ai-route";
import { reserveSpeech, userDailyLimit } from "@/lib/ai-usage";
import { authEnabled } from "@/lib/auth-config";
import { speech, SPEAKERS, type Speaker } from "@/lib/google-tts";

const isDev = process.env.NODE_ENV === "development";
// A model answer at B2 is the longest text.
const MAX_CHARS = 1500;

/** Speaks Norwegian text the site has no recording of. Without an account, the browser's voice is used instead. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown; speaker?: unknown; rate?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return fail("Ugyldig tekst.", 400);
  const speaker: Speaker = typeof body?.speaker === "string" && body.speaker in SPEAKERS ? (body.speaker as Speaker) : "sensor";
  const rate = typeof body?.rate === "number" && Number.isFinite(body.rate) ? Math.min(1.3, Math.max(0.6, body.rate)) : 1;

  const userId = authEnabled ? (await auth()).userId : null;
  if (!userId && !isDev) return fail("Logg inn for å bruke dette.", 401);
  if (userId) {
    const reserved = await reserveSpeech(userId, text.length);
    if (reserved === "user-limit") return fail(`Du har nådd grensen på ${userDailyLimit("speech")} for i dag.`, 429);
    if (reserved !== "ok") return fail("Opplesning er stengt resten av dagen.", 503);
  }

  try {
    const audio = await speech(text, speaker, rate);
    if (!audio) return fail("Opplesning er ikke satt opp.", 503);
    return new Response(audio as BodyInit, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch (err) {
    console.error("speech failed", err);
    return fail("Opplesning er ikke tilgjengelig akkurat nå.", 503);
  }
}
