/*
 * Records the listening tasks with Google Cloud Text-to-Speech.
 *
 *   npm run audio -- --dry-run   shows what would be recorded and how many characters it costs
 *   npm run audio                records new and changed tasks
 *   npm run audio -- --force     records every task again
 *   npm run audio -- --only=pa-kafeen,hos-legen
 *
 * Needs GOOGLE_TTS_API_KEY in .env.local. Each line becomes its own MP3 in
 * public/audio/lytting/<task>/, and src/content/listening/audio.json lists the recorded tasks,
 * so the player only uses recordings that match the current text and falls back to the
 * browser voice for the rest.
 *
 * The default voices are Chirp 3 HD, Google's most natural ones, with many Norwegian voices.
 * --voices=Wavenet uses the older WaveNet voices instead.
 *
 * Google gives 1 million Chirp 3 HD characters (4 million WaveNet) free each month, and all the
 * tasks together are about 60 000, so recording them costs nothing. To stay well inside that,
 * the script refuses to send more than MAX_CHARS in one run or MONTH_CHARS in one month
 * (counted in .audio-usage.json) unless --allow-more is given.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { listeningTasks } from "../src/content/listening";
import { audioKey, castVoices, LEVEL_RATE } from "../src/lib/casting";
import type { ListeningTask, VoiceGender } from "../src/lib/types";

const API = "https://texttospeech.googleapis.com/v1";
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public/audio/lytting");
const MANIFEST = path.join(ROOT, "src/content/listening/audio.json");
const USAGE = path.join(ROOT, ".audio-usage.json");
const MAX_CHARS = 200_000;
const MONTH_CHARS = 800_000;

type Manifest = { voices: string | null; tasks: Record<string, string> };
type Pools = Record<VoiceGender, string[]>;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const allowMore = args.includes("--allow-more");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");
/** Voice family to use. Chirp 3 HD is free up to 1 million characters a month. */
const family = args.find((a) => a.startsWith("--voices="))?.slice("--voices=".length) ?? "Chirp3-HD";
/** Chirp voices don't take a pitch, but they have so many voices that no task needs one. */
const usesPitch = !family.startsWith("Chirp");

/**
 * Reads a KEY=value line from .env.local when the variable isn't set already. Not from .env,
 * which may be committed: the key must never end up on GitHub.
 */
async function env(name: string): Promise<string | undefined> {
  if (process.env[name]) return process.env[name];
  const p = path.join(ROOT, ".env.local");
  if (!existsSync(p)) return undefined;
  for (const line of (await readFile(p, "utf8")).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, "");
  }
  return undefined;
}

/** Characters sent to Google per month and voice family, so the free limit is never passed. */
type Usage = Record<string, Record<string, number>>;
const month = new Date().toISOString().slice(0, 7);

async function readUsage(): Promise<Usage> {
  try {
    return JSON.parse(await readFile(USAGE, "utf8")) as Usage;
  } catch {
    return {};
  }
}

async function call<T>(url: string, init?: RequestInit, tries = 6): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return (await res.json()) as T;
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      await new Promise((r) => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
      continue;
    }
    throw new Error(`Google answered ${res.status}: ${body.slice(0, 400)}`);
  }
}

async function voicePools(key: string): Promise<Pools> {
  type Voice = { name: string; ssmlGender: string; languageCodes: string[] };
  const { voices } = await call<{ voices: Voice[] }>(`${API}/voices?languageCode=nb-NO&key=${key}`);
  const inFamily = voices.filter((v) => v.languageCodes.includes("nb-NO") && v.name.includes(`-${family}-`));
  const pools: Pools = {
    kvinne: inFamily.filter((v) => v.ssmlGender === "FEMALE").map((v) => v.name).sort(),
    mann: inFamily.filter((v) => v.ssmlGender === "MALE").map((v) => v.name).sort(),
  };
  if (!pools.kvinne.length || !pools.mann.length) {
    const names = voices.map((v) => v.name).join(", ");
    throw new Error(`No ${family} voices for both women and men in nb-NO. Available: ${names}`);
  }
  return pools;
}

const ORDINALS = [
  "første", "andre", "tredje", "fjerde", "femte", "sjette", "sjuende", "åttende", "niende", "tiende",
  "ellevte", "tolvte", "trettende", "fjortende", "femtende", "sekstende", "syttende", "attende", "nittende", "tjuende",
  "tjueførste", "tjueandre", "tjuetredje", "tjuefjerde", "tjuefemte", "tjuesjette", "tjuesjuende", "tjueåttende",
  "tjueniende", "trettiende", "trettiførste",
];
const MONTHS = "januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember";

/**
 * The text as it should be said. Dates are written «17. mai» but said «syttende mai», which
 * the voices sometimes read as a plain number. Only what is sent to Google changes.
 */
export function spoken(text: string): string {
  return text.replace(new RegExp(`\\b([1-9]|[12]\\d|3[01])\\. (?=(?:${MONTHS})\\b)`, "g"), (_, n: string) => `${ORDINALS[Number(n) - 1]} `);
}

/** The Google voice, pitch and speed for each line of a task. */
function plan(task: ListeningTask, pools: Pools) {
  const cast = castVoices(task);
  return task.lines.map((line) => {
    const c = cast[line.speaker]!;
    const pool = pools[c.gender];
    // When a task has more speakers of one type than there are voices, the extra ones get a
    // lower or higher pitch so they still sound like different people.
    const round = usesPitch ? Math.floor(c.nth / pool.length) % 3 : 0;
    return {
      text: spoken(line.text),
      voice: pool[c.index % pool.length],
      pitch: [0, -2.5, 2.5][round],
      rate: Math.round(LEVEL_RATE[task.level] * c.rate * 100) / 100,
    };
  });
}

async function synthesize(key: string, p: ReturnType<typeof plan>[number]): Promise<Buffer> {
  const { audioContent } = await call<{ audioContent: string }>(`${API}/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: p.text },
      voice: { languageCode: "nb-NO", name: p.voice },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: p.rate,
        ...(p.pitch ? { pitch: p.pitch } : {}),
        sampleRateHertz: 24000,
      },
    }),
  });
  return Buffer.from(audioContent, "base64");
}

async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8")) as Manifest;
  } catch {
    return { voices: null, tasks: {} };
  }
}

async function writeManifest(m: Manifest) {
  const tasks = Object.fromEntries(Object.entries(m.tasks).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, JSON.stringify({ voices: m.voices, tasks }, null, 2) + "\n");
}

async function main() {
  const manifest = await readManifest();
  const sameVoices = manifest.voices === family;
  const todo = listeningTasks.filter((t) => {
    if (only && !only.includes(t.id)) return false;
    if (force || !sameVoices) return true;
    const key = audioKey(t);
    return manifest.tasks[t.id] !== key || !existsSync(path.join(AUDIO_DIR, t.id, `${key}-0.mp3`));
  });
  const chars = todo.reduce((n, t) => n + t.lines.reduce((m, l) => m + l.text.length, 0), 0);

  console.log(`${todo.length} of ${listeningTasks.length} tasks to record, ${chars.toLocaleString("en")} characters, ${family} voices.`);
  if (!todo.length) return;
  if (dryRun) {
    console.log("Dry run: nothing was sent to Google.");
    return;
  }
  const usage = await readUsage();
  const used = usage[month]?.[family] ?? 0;
  if (used) console.log(`Already sent this month: ${used.toLocaleString("en")} characters.`);
  if (chars > MAX_CHARS && !allowMore) {
    console.error(`Stopped: more than ${MAX_CHARS.toLocaleString("en")} characters. Nothing was sent. Use --allow-more if you really want this.`);
    process.exit(1);
  }
  if (used + chars > MONTH_CHARS && !allowMore) {
    console.error(`Stopped: this month would pass ${MONTH_CHARS.toLocaleString("en")} characters, close to Google's free limit. Nothing was sent. Wait until next month.`);
    process.exit(1);
  }

  const key = await env("GOOGLE_TTS_API_KEY");
  if (!key) {
    console.error("GOOGLE_TTS_API_KEY is missing. Add it to .env.local, see the instructions.");
    process.exit(1);
  }

  const pools = await voicePools(key);
  console.log(`Voices: ${[...pools.kvinne, ...pools.mann].join(", ")}`);
  if (!sameVoices) manifest.tasks = {};
  manifest.voices = family;

  let done = 0;
  for (const task of todo) {
    const key36 = audioKey(task);
    const dir = path.join(AUDIO_DIR, task.id);
    await mkdir(dir, { recursive: true });
    const lines = plan(task, pools);
    // A few lines at a time keeps well under Google's rate limit.
    for (let i = 0; i < lines.length; i += 4) {
      const batch = lines.slice(i, i + 4);
      const audio = await Promise.all(batch.map((p) => synthesize(key, p)));
      await Promise.all(audio.map((buf, j) => writeFile(path.join(dir, `${key36}-${i + j}.mp3`), buf)));
      usage[month] = { ...usage[month], [family]: (usage[month]?.[family] ?? 0) + batch.reduce((n, p) => n + p.text.length, 0) };
      await writeFile(USAGE, JSON.stringify(usage, null, 2) + "\n");
    }
    // Remove recordings of older versions of the text.
    for (const file of await readdir(dir)) if (!file.startsWith(`${key36}-`)) await rm(path.join(dir, file));
    manifest.tasks[task.id] = key36;
    await writeManifest(manifest);
    console.log(`${++done}/${todo.length} ${task.id}`);
  }

  // Forget tasks that no longer exist.
  const ids = new Set(listeningTasks.map((t) => t.id));
  for (const id of Object.keys(manifest.tasks)) if (!ids.has(id)) delete manifest.tasks[id];
  if (existsSync(AUDIO_DIR)) {
    for (const dir of await readdir(AUDIO_DIR)) if (!ids.has(dir)) await rm(path.join(AUDIO_DIR, dir), { recursive: true });
  }
  await writeManifest(manifest);
  console.log("Done.");
}

if (process.argv[1]?.endsWith("generate-audio.ts")) main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
