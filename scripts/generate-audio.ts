/*
 * Records the listening tasks with Google Cloud Text-to-Speech.
 *
 *   npm run audio -- --dry-run   shows what would be recorded and how many characters it costs
 *   npm run audio                records new and changed tasks
 *   npm run audio -- --force     records every task again
 *   npm run audio -- --only=pa-kafeen,hos-legen
 *   npm run audio -- --parallel=6     lines recorded at once (default 4, or 2 for Gemini voices)
 *   npm run audio -- --durations     only measures the recorded lines again (needs ffprobe)
 *
 * Needs GOOGLE_TTS_API_KEY in .env.local. Each line becomes its own MP3 in
 * public/audio/lytting/<task>/, and src/content/listening/audio.json lists the recorded tasks,
 * so the player only uses recordings that match the current text and falls back to the
 * browser voice for the rest.
 *
 * The default voices are Chirp 3 HD, Google's most natural ones, with many Norwegian voices.
 * --voices=Wavenet uses the older WaveNet voices instead.
 *
 * --voices=gemini-2.5-pro-tts (or gemini-2.5-flash-tts, gemini-3.1-flash-tts-preview) uses Gemini
 * voices, which act each line from a director's note: the scene, who speaks, and the pace for the
 * level. They are paid from the Google Cloud credit, not free, and need a service account instead
 * of the API key: GOOGLE_SA_JSON (the JSON key) or GOOGLE_APPLICATION_CREDENTIALS (a path to it),
 * for an account with the Vertex AI User role.
 *
 *   npm run audio -- --voices=gemini-2.5-pro-tts --preview --only=time-hos-tannlegen
 *     writes one joined MP3 per task to .audio-preview/ to listen to, with the player's
 *     phone/loudspeaker/radio effect, and leaves the site's recordings alone (needs ffmpeg).
 *
 * Google gives 1 million Chirp 3 HD characters (4 million WaveNet) free each month, and all the
 * tasks together are about 60 000, so recording them costs nothing. To stay well inside that,
 * the script refuses to send more than MAX_CHARS in one run or MONTH_CHARS in one month
 * (counted in .audio-usage.json) unless --allow-more is given.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { listeningTasks } from "../src/content/listening";
import { audioKey, castVoices, effectFor, LEVEL_RATE } from "../src/lib/casting";
import type { ListeningTask, VoiceGender } from "../src/lib/types";
import { accessToken } from "../src/lib/google-auth";

const API = "https://texttospeech.googleapis.com/v1";
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public/audio/lytting");
const MANIFEST = path.join(ROOT, "src/content/listening/audio.json");
const USAGE = path.join(ROOT, ".audio-usage.json");
const MAX_CHARS = 200_000;
const MONTH_CHARS = 800_000;

/** The recorded tasks, and how long each line is in seconds, so the player's progress bar can follow the time. */
export type Manifest = { voices: string | null; tasks: Record<string, string>; durations: Record<string, number[]> };
type Pools = Record<VoiceGender, string[]>;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const durationsOnly = args.includes("--durations");
const allowMore = args.includes("--allow-more");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");
/** Voice family to use. Chirp 3 HD is free up to 1 million characters a month. */
export const family = args.find((a) => a.startsWith("--voices="))?.slice("--voices=".length) ?? "Chirp3-HD";
/** Gemini voices act each line from a director's note. */
const gemini = family.startsWith("gemini");
/** Chirp and Gemini voices don't take a pitch, but they have so many voices that no task needs one. */
const usesPitch = !family.startsWith("Chirp") && !gemini;
/** Joined previews to listen to instead of the site's recordings. */
const preview = args.includes("--preview");
const PREVIEW_DIR = path.join(ROOT, ".audio-preview", family);

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

/** API key for Chirp and WaveNet; a service account token for Gemini voices, which refuse keys. */
async function authHeaders(): Promise<Record<string, string>> {
  if (gemini) {
    const token = await accessToken();
    if (!token) throw new Error("Gemini voices need a service account: set GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
    return { Authorization: `Bearer ${token}` };
  }
  const key = await env("GOOGLE_TTS_API_KEY");
  if (!key) throw new Error("GOOGLE_TTS_API_KEY is missing. Add it to .env.local, see the instructions.");
  return { "X-Goog-Api-Key": key };
}

/** Characters sent to Google per month and voice family, so the free limit is never passed. */
type Usage = Record<string, Record<string, number>>;
const month = new Date().toISOString().slice(0, 7);

/** Adds characters sent outside a recording run (retakes) to this month's count. */
export async function addUsage(chars: number) {
  const usage = await readUsage();
  usage[month] = { ...usage[month], [family]: (usage[month]?.[family] ?? 0) + chars };
  await writeFile(USAGE, JSON.stringify(usage, null, 2) + "\n");
}

async function readUsage(): Promise<Usage> {
  try {
    return JSON.parse(await readFile(USAGE, "utf8")) as Usage;
  } catch {
    return {};
  }
}

async function call<T>(url: string, init?: RequestInit, tries = 6): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    // A dropped connection is retried like a busy server.
    const res = await fetch(url, init).catch((err: unknown) => {
      if (attempt < tries) return null;
      throw err;
    });
    if (!res) {
      await new Promise((r) => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      await new Promise((r) => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
      continue;
    }
    throw new Error(`Google answered ${res.status}: ${body.slice(0, 400)}`);
  }
}

export async function voicePools(): Promise<Pools> {
  type Voice = { name: string; ssmlGender: string; languageCodes: string[] };
  const { voices } = await call<{ voices: Voice[] }>(`${API}/voices?languageCode=nb-NO`, { headers: await authHeaders() });
  // Gemini voices have the same names as Chirp 3 HD's, without the prefix: «Kore», «Puck».
  const listed = gemini ? "Chirp3-HD" : family;
  const inFamily = voices.filter((v) => v.languageCodes.includes("nb-NO") && v.name.includes(`-${listed}-`));
  const name = (v: Voice) => (gemini ? v.name.split("-").pop()! : v.name);
  const pools: Pools = {
    kvinne: inFamily.filter((v) => v.ssmlGender === "FEMALE").map(name).sort(),
    mann: inFamily.filter((v) => v.ssmlGender === "MALE").map(name).sort(),
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

const PACE: Record<ListeningTask["level"], string> = {
  A1: "a bit slower than normal and very clearly, without long pauses between the words",
  A2: "a little slower than normal and clearly",
  B1: "at a natural, everyday pace",
  B2: "at a natural, lively everyday pace, as people really talk",
};

/** The director's note for a Gemini voice: who is speaking, where, and how. */
export function direction(task: ListeningTask, speaker: ListeningTask["lines"][number]["speaker"]): string {
  const who = task.speakers[speaker] ?? "a person";
  const fx = effectFor(task, speaker);
  const setting =
    fx === "pa"
      ? "It is an announcement over loudspeakers: calm, clear and a little formal."
      : fx === "radio"
        ? "It is said on the radio."
        : fx === "phone" || task.genre === "Telefonsamtale"
          ? "It is a phone call."
          : "";
  return [
    "Read the transcript aloud in Norwegian bokmål with an Eastern Norwegian accent. Do not read these notes aloud.",
    `Scene (${task.genre}): ${task.situation} ${setting}`.trim(),
    `Your role (never say it): ${who}. Show the feelings the situation calls for, as an actor would.`,
    `Pace: ${PACE[task.level]}. Sound like a real person, not a newsreader.`,
  ].join("\n");
}

/** Longest pause kept inside a line, in seconds: a little longer for beginners. */
const MAX_PAUSE: Record<ListeningTask["level"], number> = { A1: 0.5, A2: 0.45, B1: 0.4, B2: 0.35 };

/**
 * Gemini voices sometimes pause for most of a second between words, which makes slow levels drag.
 * Shortens every pause to at most `maxPause` seconds and trims silence at the ends, judging
 * silence by the loudness of each 10 ms. Needs ffmpeg.
 */
export function tighten(mp3: Buffer, maxPause: number): Buffer {
  const rate = 24000;
  const pcm = execFileSync("ffmpeg", ["-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", `${rate}`, "pipe:1"], {
    input: mp3,
    maxBuffer: 1 << 28,
  });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const frame = rate / 100;
  const frames = Math.floor(samples.length / frame);
  const threshold = 32768 * 10 ** (-45 / 20);
  const quiet = Array.from({ length: frames }, (_, f) => {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / frame) < threshold;
  });

  const parts: Int16Array[] = [];
  const keep = (from: number, to: number) => parts.push(samples.subarray(from * frame, to * frame));
  for (let f = 0; f < frames; ) {
    const start = f;
    const silent = quiet[f];
    while (f < frames && quiet[f] === silent) f++;
    if (!silent) {
      keep(start, f);
      continue;
    }
    // Pauses keep a little of each side; the ends keep just enough not to clip a breath.
    const allowed = start === 0 ? 5 : f === frames ? 10 : Math.round(maxPause * 100);
    if (f - start <= allowed) keep(start, f);
    else {
      keep(start, start + Math.floor(allowed / 2));
      keep(f - Math.ceil(allowed / 2), f);
    }
  }
  const out = new Int16Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return execFileSync(
    "ffmpeg",
    ["-loglevel", "error", "-f", "s16le", "-ar", `${rate}`, "-ac", "1", "-i", "pipe:0", "-b:a", "48k", "-f", "mp3", "pipe:1"],
    { input: Buffer.from(out.buffer), maxBuffer: 1 << 28 },
  );
}

/** The Google voice, pitch and speed for each line of a task. */
export function plan(task: ListeningTask, pools: Pools) {
  const cast = castVoices(task);
  return task.lines.map((line) => {
    const c = cast[line.speaker]!;
    const pool = pools[c.gender];
    // When a task has more speakers of one type than there are voices, the extra ones get a
    // lower or higher pitch so they still sound like different people.
    const round = usesPitch ? Math.floor(c.nth / pool.length) % 3 : 0;
    return {
      text: spoken(line.text),
      prompt: gemini ? direction(task, line.speaker) : undefined,
      effect: effectFor(task, line.speaker),
      voice: pool[c.index % pool.length],
      pitch: [0, -2.5, 2.5][round],
      rate: Math.round(LEVEL_RATE[task.level] * c.rate * 100) / 100,
      maxPause: MAX_PAUSE[task.level],
    };
  });
}

export async function synthesize(p: ReturnType<typeof plan>[number]): Promise<Buffer> {
  const body = gemini
    ? {
        // Gemini sets the pace from the note, so no speaking rate.
        input: { prompt: p.prompt, text: p.text },
        voice: { languageCode: "nb-NO", name: p.voice, modelName: family },
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
      }
    : {
        input: { text: p.text },
        voice: { languageCode: "nb-NO", name: p.voice },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: p.rate,
          ...(p.pitch ? { pitch: p.pitch } : {}),
          sampleRateHertz: 24000,
        },
      };
  const { audioContent } = await call<{ audioContent: string }>(`${API}/text:synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  const audio = Buffer.from(audioContent, "base64");
  return gemini ? tighten(audio, p.maxPause) : audio;
}

export async function readManifest(): Promise<Manifest> {
  try {
    return { durations: {}, ...(JSON.parse(await readFile(MANIFEST, "utf8")) as Partial<Manifest>) } as Manifest;
  } catch {
    return { voices: null, tasks: {}, durations: {} };
  }
}

export async function writeManifest(m: Manifest) {
  const ids = Object.keys(m.tasks).sort((a, b) => a.localeCompare(b));
  const tasks = Object.fromEntries(ids.map((id) => [id, m.tasks[id]]));
  const durations = Object.fromEntries(ids.filter((id) => m.durations[id]).map((id) => [id, m.durations[id]]));
  // One line per task's durations instead of one per number.
  const json = JSON.stringify({ voices: m.voices, tasks, durations }, null, 2).replace(/\[\s+([\d.,\s]+?)\s+\]/g, (_, xs: string) => `[${xs.split(/,\s*/).join(", ")}]`);
  await writeFile(MANIFEST, json + "\n");
}

/** How long each recorded line of a task is, in seconds. Needs ffprobe. */
export function measure(task: ListeningTask, key: string): number[] {
  return task.lines.map((_, i) => {
    const file = path.join(AUDIO_DIR, task.id, `${key}-${i}.mp3`);
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    return Math.round(Number(out) * 100) / 100;
  });
}

const FX: Record<string, string> = {
  phone: "highpass=f=320,lowpass=f=3300,equalizer=f=1700:t=q:w=1:g=6",
  pa: "highpass=f=220,lowpass=f=4800,aecho=0.8:0.6:70|140:0.25|0.15",
  radio: "highpass=f=90,lowpass=f=9000,acompressor",
};

/** Joins a task's lines into one MP3 with pauses and the player's effects, to listen to. */
async function writePreview(task: ListeningTask, lines: ReturnType<typeof plan>, audio: Buffer[]) {
  const dir = path.join(PREVIEW_DIR, task.id);
  await mkdir(dir, { recursive: true });
  const parts: string[] = [];
  for (const [i, buf] of audio.entries()) {
    const mp3 = path.join(dir, `${i}.mp3`);
    const wav = path.join(dir, `${i}.wav`);
    await writeFile(mp3, buf);
    const pause = i + 1 < lines.length && task.lines[i + 1].speaker === task.lines[i].speaker ? 0.3 : 0.55;
    const effect = lines[i].effect;
    const filter = [effect ? FX[effect] : "anull", `apad=pad_dur=${pause}`].join(",");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3, "-af", filter, "-ar", "24000", "-ac", "1", wav]);
    parts.push(`file '${wav}'`);
  }
  await writeFile(path.join(dir, "list.txt"), parts.join("\n"));
  const out = path.join(PREVIEW_DIR, `${task.id}.mp3`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-b:a", "96k", out]);
  await rm(dir, { recursive: true });
  return out;
}

async function main() {
  const manifest = await readManifest();
  if (durationsOnly) {
    for (const task of listeningTasks) if (manifest.tasks[task.id] === audioKey(task)) manifest.durations[task.id] = measure(task, audioKey(task));
    await writeManifest(manifest);
    console.log(`Measured ${Object.keys(manifest.durations).length} tasks.`);
    return;
  }
  const sameVoices = manifest.voices === family;
  const todo = listeningTasks.filter((t) => {
    if (only && !only.includes(t.id)) return false;
    if (preview || force || !sameVoices) return true;
    const key = audioKey(t);
    return manifest.tasks[t.id] !== key || !existsSync(path.join(AUDIO_DIR, t.id, `${key}-0.mp3`));
  });
  const chars = todo.reduce((n, t) => n + t.lines.reduce((m, l) => m + l.text.length, 0), 0);

  console.log(
    `${todo.length} of ${listeningTasks.length} tasks to ${preview ? "preview" : "record"}, ${chars.toLocaleString("en")} characters, ${family} voices.`,
  );
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
    console.error(`Stopped: this month would pass ${MONTH_CHARS.toLocaleString("en")} characters with ${family}. Nothing was sent. Wait until next month.`);
    process.exit(1);
  }

  const pools = await voicePools();
  console.log(`Voices: ${[...pools.kvinne, ...pools.mann].join(", ")}`);
  if (!preview) {
    if (!sameVoices) manifest.tasks = manifest.durations = {};
    manifest.voices = family;
  }

  // Lines recorded at once. Gemini answers slowly but has a lower rate limit; 429s are retried.
  const perBatch = Number(args.find((a) => a.startsWith("--parallel="))?.slice("--parallel=".length)) || (gemini ? 2 : 4);
  let done = 0;
  for (const task of todo) {
    const key36 = audioKey(task);
    const dir = path.join(AUDIO_DIR, task.id);
    const lines = plan(task, pools);
    const audio: Buffer[] = [];
    for (let i = 0; i < lines.length; i += perBatch) {
      const batch = lines.slice(i, i + perBatch);
      audio.push(...(await Promise.all(batch.map((p) => synthesize(p)))));
      usage[month] = { ...usage[month], [family]: (usage[month]?.[family] ?? 0) + batch.reduce((n, p) => n + p.text.length, 0) };
      await writeFile(USAGE, JSON.stringify(usage, null, 2) + "\n");
    }
    if (preview) {
      console.log(`${++done}/${todo.length} ${await writePreview(task, lines, audio)}`);
      continue;
    }
    await mkdir(dir, { recursive: true });
    await Promise.all(audio.map((buf, i) => writeFile(path.join(dir, `${key36}-${i}.mp3`), buf)));
    // Remove recordings of older versions of the text.
    for (const file of await readdir(dir)) if (!file.startsWith(`${key36}-`)) await rm(path.join(dir, file));
    manifest.tasks[task.id] = key36;
    manifest.durations[task.id] = measure(task, key36);
    await writeManifest(manifest);
    console.log(`${++done}/${todo.length} ${task.id}`);
  }
  if (preview) return;

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
