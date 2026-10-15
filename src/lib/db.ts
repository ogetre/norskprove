import "server-only";
import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

let schemaReady: Promise<void> | null = null;

/** Creates the tables on first use; retried if it fails. */
export function ensureSchema(): Promise<void> {
  const db = sql();
  schemaReady ??= Promise.all([
    db`
      CREATE TABLE IF NOT EXISTS progress (
        user_id    text PRIMARY KEY,
        state      jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    db`
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id                text PRIMARY KEY,
        plan                   text NOT NULL CHECK (plan IN ('start','pluss','premium')),
        status                 text NOT NULL DEFAULT 'active',
        source                 text NOT NULL DEFAULT 'manual',
        current_period_end     timestamptz,
        stripe_customer_id     text,
        stripe_subscription_id text,
        updated_at             timestamptz NOT NULL DEFAULT now()
      )`,
    db`
      CREATE TABLE IF NOT EXISTS ai_usage (
        user_id       text NOT NULL,
        day           date NOT NULL,
        requests      integer NOT NULL DEFAULT 0,
        input_tokens  bigint NOT NULL DEFAULT 0,
        output_tokens bigint NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, day)
      )`,
    db`
      CREATE TABLE IF NOT EXISTS ai_cache (
        key        text PRIMARY KEY,
        value      jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
  ])
    .then(() => undefined)
    .catch((err: unknown) => {
      schemaReady = null;
      throw err;
    });
  return schemaReady;
}
