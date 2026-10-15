import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { toJSONSchema } from "zod";

/** The cheapest current Claude model; used for every AI feature on the site. */
export const MODEL = "claude-haiku-5-5";

/** USD per token for Claude Haiku 5.5 (prompts up to 100K tokens). */
export const PRICE_PER_TOKEN = { input: 0.0000001, output: 0.0000005 };

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  client ??= new Anthropic({ timeout: 75_000, maxRetries: 1 });
  return client;
}

/** Claude declined to answer. */
export class Refused extends Error {}

/**
 * A JSON schema for structured output, sent as is: the SDK's zod helper turns `enum` into
 * a description, and the API should enforce the allowed values.
 */
export function outputSchema(schema: z.ZodType): Record<string, unknown> {
  const json: Record<string, unknown> = toJSONSchema(schema);
  delete json.$schema;
  return json;
}

/**
 * One request with a JSON answer checked against `schema`. `onUsage` gets the billed
 * tokens, also when the answer turns out unusable.
 */
export async function askJson<T extends z.ZodType>(
  schema: T,
  {
    system,
    prompt,
    effort,
    maxTokens,
    onUsage,
  }: {
    system: string;
    prompt: string;
    effort: "low" | "medium" | "high";
    maxTokens: number;
    onUsage: (input: number, output: number) => Promise<void>;
  },
): Promise<z.infer<T>> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort, format: { type: "json_schema", schema: outputSchema(schema) } },
  });
  await onUsage(response.usage.input_tokens, response.usage.output_tokens);
  if (response.stop_reason === "refusal") throw new Refused();
  const json = response.content.find((b) => b.type === "text")?.text;
  if (!json || response.stop_reason !== "end_turn") {
    throw new Error(`No complete answer in the response (stop_reason ${response.stop_reason})`);
  }
  return schema.parse(JSON.parse(json));
}
