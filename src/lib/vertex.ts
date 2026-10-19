import "server-only";
import { accessToken, projectId } from "./google-auth";

/*
 * Gemini on Vertex AI, paid from the Google Cloud credit. Unlike Claude it hears the candidate's
 * recordings in the oral test, so it can transcribe them on any browser and assess pronunciation
 * and fluency. Requests go to an EU region (VERTEX_LOCATION, by default europe-north1 in
 * Finland), so the recordings stay in the EU, and Google does not train on them. Setting
 * ORAL_AI=claude turns Gemini off and the oral test falls back to Claude on the transcripts.
 */

/** Hears each answer during the test: fast enough for the examiner's follow-up. */
export const FAST_MODEL = "gemini-2.5-flash";
/** Grades a task from all its recordings at the end. */
export const GRADE_MODEL = "gemini-2.5-pro";

/** List prices in USD per token, only used to keep the daily spending cap. */
const PRICES: Record<string, { text: number; audio: number; output: number }> = {
  [FAST_MODEL]: { text: 0.3e-6, audio: 1e-6, output: 2.5e-6 },
  [GRADE_MODEL]: { text: 1.25e-6, audio: 1.25e-6, output: 10e-6 },
};

export class VertexError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Whether Gemini can be used: a service account is set and it isn't switched off. */
export function vertexReady(): boolean {
  return process.env.ORAL_AI !== "claude" && Boolean(process.env.GOOGLE_SA_JSON?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** A response schema in Vertex AI's OpenAPI subset. */
export type Schema = {
  type: "OBJECT" | "ARRAY" | "STRING" | "BOOLEAN" | "INTEGER" | "NUMBER";
  description?: string;
  enum?: string[];
  nullable?: boolean;
  properties?: Record<string, Schema>;
  required?: string[];
  /** The order Gemini writes the properties in, e.g. the transcripts before the assessment. */
  propertyOrdering?: string[];
  items?: Schema;
};

type Usage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  promptTokensDetails?: { modality: string; tokenCount: number }[];
};

function cost(model: string, usage: Usage | undefined): number {
  const price = PRICES[model];
  if (!price || !usage) return 0;
  const audio = usage.promptTokensDetails?.find((d) => d.modality === "AUDIO")?.tokenCount ?? 0;
  const text = (usage.promptTokenCount ?? 0) - audio;
  const output = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  return text * price.text + audio * price.audio + output * price.output;
}

/**
 * Asks Gemini for JSON in the shape of `schema`. `onCost` gets what the request cost in USD.
 * A busy or failing service is tried again up to `retries` times, waiting longer each time;
 * anything else throws a VertexError.
 */
export async function geminiJson(
  model: string,
  {
    system,
    parts,
    schema,
    thinking,
    timeoutMs,
    retries = 1,
    onCost,
  }: {
    system: string;
    parts: Part[];
    schema: Schema;
    thinking: number;
    timeoutMs: number;
    retries?: number;
    onCost?: (usd: number) => Promise<void> | void;
  },
): Promise<unknown> {
  const token = await accessToken();
  const project = await projectId();
  if (!token || !project) throw new VertexError("No service account is set up.", 503);
  const location = process.env.VERTEX_LOCATION || "europe-north1";
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: thinking },
    },
  });

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name === "TimeoutError") throw new VertexError("Gemini took too long.", 504);
      if (attempt <= retries) return null;
      throw new VertexError("Gemini could not be reached.", 503);
    });
    if (!res || ((res.status === 429 || res.status >= 500) && attempt <= retries)) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** (attempt - 1)));
      continue;
    }
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
      usageMetadata?: Usage;
      error?: { message?: string };
    };
    if (!res.ok) throw new VertexError(data.error?.message ?? `Vertex AI answered ${res.status}.`, res.status);
    await onCost?.(cost(model, data.usageMetadata));
    const text = data.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");
    if (!text) throw new VertexError(`Gemini gave no answer (${data.candidates?.[0]?.finishReason ?? "empty"}).`, 502);
    try {
      return JSON.parse(text);
    } catch {
      throw new VertexError("Gemini's answer was not JSON.", 502);
    }
  }
}
