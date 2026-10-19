"use client";

import { useEffect, useState } from "react";
import type { OralAllowance } from "./plans";
import type { Answer } from "./speaking-checks";
import type { SpeakingFeedback } from "./types";

/*
 * The browser's side of the AI check of the oral test (api/oral-check): how many checks the
 * learner has, starting one, sending each answer, and having a task graded from its recordings.
 */

export type OralInfo =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "off" }
  | { state: "ready"; heard: boolean; allowance: OralAllowance; open: boolean };

export function useOralInfo(): OralInfo {
  const [info, setInfo] = useState<OralInfo>({ state: "loading" });
  useEffect(() => {
    let live = true;
    fetch("/api/oral-check")
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          available?: boolean;
          heard?: boolean;
          allowance?: OralAllowance;
          open?: boolean;
        } | null;
        if (res.status === 401) return { state: "signed-out" } as const;
        if (!res.ok || !data?.available || !data.allowance) return { state: "off" } as const;
        return { state: "ready", heard: Boolean(data.heard), allowance: data.allowance, open: Boolean(data.open) } as const;
      })
      .catch(() => ({ state: "off" }) as const)
      .then((i) => {
        if (live) setInfo(i);
      });
    return () => {
      live = false;
    };
  }, []);
  return info;
}

/** What the learner has left, as one line. */
export function allowanceText(a: OralAllowance): string {
  if (a.left === null) return "Du har ubegrenset AI-vurdering med Premium.";
  if (a.free) return a.left > 0 ? "Den første AI-vurderingen er gratis." : "Du har brukt den gratis AI-vurderingen din.";
  return a.left > 0
    ? `Du har ${a.left} av ${a.limit} AI-vurderinger igjen denne måneden. Denne prøven bruker én.`
    : "Du har brukt AI-vurderingene dine denne måneden.";
}

export async function startCheck(taskIds: string[]): Promise<{ id: string } | { error: string }> {
  const res = await fetch("/api/oral-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds }),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { id?: string; error?: string } | null;
  if (res?.ok && data?.id) return { id: data.id };
  return { error: data?.error ?? "Fikk ikke startet AI-vurderingen. Prøven fortsetter uten." };
}

const recordingOf = async (a: Answer): Promise<Blob | null> =>
  a.url ? fetch(a.url).then((r) => r.blob(), () => null) : null;

const turnsOf = (row: Answer[]) => row.map((a) => ({ question: a.question, answer: a.transcript }));

/** What Gemini heard in the answer, and the examiner's follow-up when asked for; null if it failed. */
export async function sendAnswer(
  checkId: string,
  taskId: string,
  earlier: Answer[],
  answer: Answer,
  followUp: boolean,
): Promise<{ transcript: string; followUp: string | null } | null> {
  const form = new FormData();
  form.set("checkId", checkId);
  form.set("taskId", taskId);
  form.set("question", answer.question);
  form.set("text", answer.transcript);
  form.set("earlier", JSON.stringify(turnsOf(earlier)));
  if (followUp) form.set("followUp", "1");
  const audio = await recordingOf(answer);
  if (audio) form.set("audio", audio);
  const abort = AbortSignal.timeout(30_000);
  const res = await fetch("/api/oral-check/answer", { method: "POST", body: form, signal: abort }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { transcript?: string; followUp?: string | null } | null;
  if (!res?.ok || typeof data?.transcript !== "string") return null;
  return { transcript: data.transcript, followUp: data.followUp ?? null };
}

/** A task's grading, and what Gemini heard in each answer when it heard the recordings. */
export type Graded = { feedback: SpeakingFeedback; transcripts: string[] | null };

// One grading per task of a check, shared by every view of it.
const gradings = new Map<string, Promise<Graded>>();

// The AI's quota per minute is small, so a test's tasks are graded two at a time.
let running = 0;
const waiting: (() => void)[] = [];
async function inTurn<T>(work: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** The AI grading of one task from its recordings. Throws with a message for the learner. */
export function gradeTask(checkId: string, taskId: string, answers: Answer[], lang: string): Promise<Graded> {
  const key = `${checkId}:${taskId}`;
  let request = gradings.get(key);
  if (!request) {
    request = inTurn(async () => {
      const form = new FormData();
      form.set("checkId", checkId);
      form.set("taskId", taskId);
      form.set("lang", lang);
      form.set("turns", JSON.stringify(answers.map((a) => ({ question: a.question, followUp: Boolean(a.followUp), text: a.transcript }))));
      const audio = await Promise.all(answers.map(recordingOf));
      audio.forEach((blob, i) => blob && form.set(`audio_${i}`, blob));
      const res = await fetch("/api/oral-check/grade", { method: "POST", body: form }).catch(() => null);
      if (!res) throw new Error("Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.");
      const data = (await res.json().catch(() => null)) as { feedback?: SpeakingFeedback; transcripts?: string[]; error?: string } | null;
      if (res.ok && data?.feedback) return { feedback: data.feedback, transcripts: data.transcripts ?? null };
      throw new Error(data?.error ?? "Noe gikk galt med vurderingen. Prøv igjen.");
    });
    gradings.set(key, request);
    request.catch(() => gradings.delete(key));
  }
  return request;
}
