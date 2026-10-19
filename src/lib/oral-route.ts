import "server-only";
import { auth } from "@clerk/nextjs/server";
import { fail } from "./ai-route";
import { authEnabled } from "./auth-config";
import type { Recording } from "./oral-ai";
import type { PlanId } from "./plans";
import { activePlan } from "./subscription";

/*
 * Shared by the routes of the AI check of the oral test (api/oral-check): who is asking, with
 * which plan, and the recordings they send.
 */

// Locally, without sign-in, the oral checks can be tried as Premium, or with DEV_ORAL_PLAN set
// to start, pluss or none (the free check).
const isDev = process.env.NODE_ENV === "development";

function devPlan(): PlanId | null {
  const plan = process.env.DEV_ORAL_PLAN;
  if (plan === "none") return null;
  return plan === "start" || plan === "pluss" ? plan : "premium";
}

export async function oralUser(): Promise<{ userId: string; plan: PlanId | null } | Response> {
  const userId = authEnabled ? (await auth()).userId : null;
  if (userId) return { userId, plan: await activePlan(userId) };
  if (isDev) return { userId: `dev-${process.env.DEV_ORAL_PLAN ?? "premium"}`, plan: devPlan() };
  return fail("Logg inn for å bruke dette.", 401);
}

/** Formats Gemini takes, as browsers record them: webm/ogg (Chrome, Firefox) and mp4 (Safari). */
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac", "audio/x-m4a"]);

/** Vercel takes at most 4.5 MB per request; at 32 kbit/s that is far more than a task. */
export const MAX_AUDIO_BYTES = 4_200_000;

/** A recording from a form field, or null when it is missing, empty or not audio. */
export async function recordingFrom(value: FormDataEntryValue | null): Promise<Recording | null> {
  if (!(value instanceof Blob) || value.size === 0 || value.size > MAX_AUDIO_BYTES) return null;
  const mimeType = value.type.split(";")[0].trim().toLowerCase();
  if (!AUDIO_TYPES.has(mimeType)) return null;
  return { mimeType, data: Buffer.from(await value.arrayBuffer()) };
}
