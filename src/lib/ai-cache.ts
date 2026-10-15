import "server-only";
import { createHash } from "node:crypto";
import { ensureSchema, sql } from "./db";

/*
 * AI answers that are the same for everyone (a word in a sentence, a paragraph in a
 * language) are kept, so each is paid for once.
 */

export function hashKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureSchema();
  const rows = await sql()`SELECT value FROM ai_cache WHERE key = ${key}`;
  return (rows[0]?.value as T | undefined) ?? null;
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await sql()`
    INSERT INTO ai_cache (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
    ON CONFLICT (key) DO NOTHING`;
}
