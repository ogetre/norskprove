import "server-only";
import { accessToken, projectId } from "./google-auth";

/*
 * Norwegian speech from Google's Chirp 3 HD voices, for what the site can't record in advance: the
 * AI examiner's follow-ups, the AI's model answers and single words. Kore is the examiner, as in
 * the recordings (scripts/generate-narration.ts); Charon reads the candidate's example answers.
 */

export const SPEAKERS = { sensor: "nb-NO-Chirp3-HD-Kore", kandidat: "nb-NO-Chirp3-HD-Charon" } as const;
export type Speaker = keyof typeof SPEAKERS;

/** The text as MP3, or null when no service account is set up. */
export async function speech(text: string, speaker: Speaker, rate: number): Promise<Uint8Array | null> {
  const token = await accessToken();
  if (!token) return null;
  const project = await projectId();
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(project ? { "x-goog-user-project": project } : {}),
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "nb-NO", name: SPEAKERS[speaker] },
      audioConfig: { audioEncoding: "MP3", speakingRate: rate },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google text-to-speech answered ${res.status}`);
  const { audioContent } = (await res.json()) as { audioContent: string };
  return Buffer.from(audioContent, "base64");
}
