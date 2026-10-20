import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { authEnabled } from "./auth-config";
import { PRICE_PER_TOKEN } from "./claude";
import { ensureSchema, sql } from "./db";
import { BETA_ORAL_CHECKS, BETA_WRITING_CHECKS } from "./plans";

/*
 * The owner's statistics: accounts from Clerk, and what signed-in learners do from their saved
 * progress and the AI counters. Only totals, never one learner's data. Learners without an account
 * keep their progress in the browser, so they only show up in Vercel Analytics.
 */

const TZ = "Europe/Oslo";
/** How many days the daily charts cover. */
export const DAYS = 30;

export type Daily = { day: string; value: number }[];
export type Count = { key: string; value: number }[];

export interface Stats {
  /** The last DAYS days in Oslo time, oldest first, as YYYY-MM-DD. */
  days: string[];
  accounts: { total: number; new7: number; newPrev7: number; active7: number; active30: number; daily: Daily } | null;
  learners: { synced: number; active7: number; daily: Daily } | null;
  practice: {
    daily: Daily;
    last7: number;
    prev7: number;
    bySkill: Count;
    byMode: Count;
    fullResults: Count;
    texts: number;
    spoken: number;
    words: number;
  } | null;
  profiles: { goals: Count; targets: Count; languages: Count; examMonths: Count } | null;
  ai: {
    daily: Daily;
    claudeUsd: number;
    geminiUsd: number;
    geminiAllTime: number;
    byKind: { kind: string; requests: number; usd: number }[];
    oralChecks: number;
    writingUsedUp: number;
    oralUsedUp: number;
  } | null;
}

const osloDay = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: TZ });

function lastDays(n: number): string[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => osloDay(now - (n - 1 - i) * 86_400_000));
}

/** One value per day, zero where nothing happened. */
function daily(days: string[], values: Map<string, number>): Daily {
  return days.map((day) => ({ day, value: values.get(day) ?? 0 }));
}

function tally<T>(rows: T[], key: (r: T) => string | null | undefined, n: (r: T) => number = () => 1): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) out.set(k, (out.get(k) ?? 0) + n(r));
  }
  return out;
}

const sorted = (m: Map<string, number>): Count =>
  [...m].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

const sum = (d: Daily, from: number, to: number) => d.slice(from, to).reduce((s, x) => s + x.value, 0);

/** A section whose query fails shows as missing instead of taking the page down. */
async function safe<T>(name: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    console.error(`admin stats: ${name} failed`, err);
    return null;
  }
}

async function accounts(days: string[]): Promise<Stats["accounts"]> {
  if (!authEnabled) return null;
  const clerk = await clerkClient();
  const users: { createdAt: number; lastActiveAt: number | null }[] = [];
  let total = 0;
  for (let offset = 0; offset < 5000; offset += 500) {
    const page = await clerk.users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
    total = page.totalCount;
    users.push(...page.data);
    if (page.data.length < 500) break;
  }
  const signups = daily(days, tally(users, (u) => osloDay(u.createdAt)));
  const since = (d: number) => Date.now() - d * 86_400_000;
  return {
    total,
    new7: users.filter((u) => u.createdAt >= since(7)).length,
    newPrev7: users.filter((u) => u.createdAt >= since(14) && u.createdAt < since(7)).length,
    active7: users.filter((u) => (u.lastActiveAt ?? 0) >= since(7)).length,
    active30: users.filter((u) => (u.lastActiveAt ?? 0) >= since(30)).length,
    daily: signups,
  };
}

async function learners(days: string[]): Promise<Stats["learners"]> {
  const db = sql();
  const [[totals], active] = await Promise.all([
    db`
      SELECT count(*)::int AS synced, count(*) FILTER (WHERE updated_at > now() - interval '7 days')::int AS active7
      FROM progress`,
    db`
      SELECT d AS day, count(*)::int AS n
      FROM progress, jsonb_array_elements_text(COALESCE(state->'activeDays', '[]'::jsonb)) AS d
      WHERE d >= ${days[0]} GROUP BY d`,
  ]);
  return {
    synced: totals.synced,
    active7: totals.active7,
    daily: daily(days, new Map(active.map((r) => [r.day as string, r.n as number]))),
  };
}

async function practice(days: string[]): Promise<Stats["practice"]> {
  const db = sql();
  // Midnight in Oslo on the first day.
  const since = days[0];
  const [attempts, [made]] = await Promise.all([
    db`
      SELECT to_char((a->>'at')::timestamptz AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day,
        a->>'skill' AS skill, a->>'mode' AS mode, a->>'result' AS result, count(*)::int AS n
      FROM progress, jsonb_array_elements(COALESCE(state->'attempts', '[]'::jsonb)) AS a
      WHERE (a->>'at')::timestamptz >= (${since}::timestamp AT TIME ZONE ${TZ})
      GROUP BY 1, 2, 3, 4`,
    db`
      SELECT
        (SELECT count(*) FROM progress, jsonb_array_elements(COALESCE(state->'writing', '[]'::jsonb)) AS w
          WHERE (w->>'at')::timestamptz >= (${since}::timestamp AT TIME ZONE ${TZ}))::int AS texts,
        (SELECT count(*) FROM progress, jsonb_array_elements(COALESCE(state->'speaking', '[]'::jsonb)) AS s
          WHERE (s->>'at')::timestamptz >= (${since}::timestamp AT TIME ZONE ${TZ}))::int AS spoken,
        (SELECT COALESCE(sum(jsonb_array_length(COALESCE(state->'words', '[]'::jsonb))), 0) FROM progress)::int AS words`,
  ]);
  type Row = { day: string; skill: string | null; mode: string | null; result: string | null; n: number };
  const rows = attempts as Row[];
  const n = (r: Row) => r.n;
  const perDay = daily(days, tally(rows, (r) => r.day, n));
  return {
    daily: perDay,
    last7: sum(perDay, -7, DAYS + 1),
    prev7: sum(perDay, -14, -7),
    bySkill: sorted(tally(rows, (r) => r.skill, n)),
    byMode: sorted(tally(rows, (r) => r.mode ?? "quick", n)),
    fullResults: [...tally(rows.filter((r) => r.mode === "full"), (r) => r.result, n)].map(([key, value]) => ({ key, value })),
    texts: made.texts,
    spoken: made.spoken,
    words: made.words,
  };
}

async function profiles(): Promise<Stats["profiles"]> {
  const rows = (await sql()`
    SELECT 'goal' AS field, state->'profile'->>'goal' AS key, count(*)::int AS n FROM progress
      WHERE state->'profile'->>'goal' IS NOT NULL GROUP BY 2
    UNION ALL
    SELECT 'target', state->'profile'->>'targetLevel', count(*)::int FROM progress
      WHERE state->'profile'->>'targetLevel' IS NOT NULL GROUP BY 2
    UNION ALL
    SELECT 'language', state->'profile'->>'nativeLanguage', count(*)::int FROM progress
      WHERE state->'profile'->>'nativeLanguage' IS NOT NULL GROUP BY 2
    UNION ALL
    SELECT 'exam', left(state->'profile'->>'examDate', 7), count(*)::int FROM progress
      WHERE state->'profile'->>'examDate' >= to_char(current_date, 'YYYY-MM') GROUP BY 2`) as {
    field: string;
    key: string;
    n: number;
  }[];
  const of = (field: string) => sorted(tally(rows.filter((r) => r.field === field), (r) => r.key, (r) => r.n));
  return {
    goals: of("goal"),
    targets: of("target"),
    languages: of("language"),
    examMonths: of("exam").sort((a, b) => a.key.localeCompare(b.key)),
  };
}

async function ai(days: string[]): Promise<Stats["ai"]> {
  const db = sql();
  const usd = (input: number, output: number) => input * PRICE_PER_TOKEN.input + output * PRICE_PER_TOKEN.output;
  const [claudeDays, claudeMonth, oralDays, [oral], [usedUp]] = await Promise.all([
    // The site's totals per kind: "_total" is writing feedback, "_total:<kind>" the others.
    db`
      SELECT day::text AS day, sum(input_tokens)::float8 AS input, sum(output_tokens)::float8 AS output
      FROM ai_usage WHERE starts_with(user_id, '_total') AND day >= ${days[0]}::date GROUP BY day`,
    db`
      SELECT user_id, sum(requests)::int AS requests, sum(input_tokens)::float8 AS input, sum(output_tokens)::float8 AS output
      FROM ai_usage WHERE starts_with(user_id, '_total') AND day >= date_trunc('month', current_date)::date
      GROUP BY user_id`,
    db`
      SELECT to_char(created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day, sum(cost_usd)::float8 AS usd
      FROM oral_checks WHERE created_at >= (${days[0]}::timestamp AT TIME ZONE ${TZ}) GROUP BY 1`,
    db`
      SELECT
        COALESCE(sum(cost_usd), 0)::float8 AS all_time,
        COALESCE(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::float8 AS month,
        count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS checks
      FROM oral_checks`,
    db`
      SELECT
        (SELECT count(*) FROM ai_usage WHERE user_id LIKE '%:month'
          AND day = date_trunc('month', current_date)::date AND requests >= ${BETA_WRITING_CHECKS}::int)::int AS writing,
        (SELECT count(*) FROM (
          SELECT user_id FROM oral_checks WHERE NOT free AND created_at >= date_trunc('month', now())
          GROUP BY user_id HAVING count(*) >= ${BETA_ORAL_CHECKS}::int) AS t)::int AS oral`,
  ]);
  const perDay = tally(claudeDays, (r) => r.day as string, (r) => usd(r.input as number, r.output as number));
  for (const r of oralDays) perDay.set(r.day as string, (perDay.get(r.day as string) ?? 0) + (r.usd as number));
  const byKind = claudeMonth
    .map((r) => ({
      kind: (r.user_id as string) === "_total" ? "feedback" : (r.user_id as string).slice("_total:".length),
      requests: r.requests as number,
      usd: usd(r.input as number, r.output as number),
    }))
    .sort((a, b) => b.requests - a.requests);
  return {
    daily: daily(days, perDay),
    claudeUsd: byKind.reduce((s, k) => s + k.usd, 0),
    geminiUsd: oral.month,
    geminiAllTime: oral.all_time,
    byKind,
    oralChecks: oral.checks,
    writingUsedUp: usedUp.writing,
    oralUsedUp: usedUp.oral,
  };
}

export async function loadStats(): Promise<Stats> {
  const days = lastDays(DAYS);
  await ensureSchema();
  const [a, l, p, pr, x] = await Promise.all([
    safe("accounts", () => accounts(days)),
    safe("learners", () => learners(days)),
    safe("practice", () => practice(days)),
    safe("profiles", () => profiles()),
    safe("ai", () => ai(days)),
  ]);
  return { days, accounts: a, learners: l, practice: p, profiles: pr, ai: x };
}
