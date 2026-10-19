/*
 * Records what the listening exam reads aloud besides the tasks: the instruction before each part
 * and every question, with one calm narrator voice. Each recording is checked by transcription
 * (as in check-audio) and recorded again when it doesn't say exactly the text, up to three times.
 *
 *   npm run audio:narration -- --voices=gemini-2.5-pro-tts --dry-run
 *   npm run audio:narration -- --voices=gemini-2.5-pro-tts
 *   npm run audio:narration -- --voices=gemini-2.5-pro-tts --force     records everything again
 *
 * Needs a service account like the Gemini voices (GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS).
 * Each text becomes public/audio/opplesning/<key>.mp3, and src/content/listening/narration.json
 * lists the recorded keys, so the exam only plays recordings that match its current texts.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { listeningTasks } from "../src/content/listening";
import { briefingSpeeches } from "../src/lib/listening-exam";
import { narrationKey } from "../src/lib/narration";
import { check } from "./check-audio";
import { addUsage, family, synthesize } from "./generate-audio";

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "public/audio/opplesning");
const MANIFEST = path.join(ROOT, "src/content/listening/narration.json");
const VOICE = "Kore";
// Gemini TTS has a per-minute quota per project; three at a time stays under it with the checks.
const PARALLEL = 3;
const RETAKES = 3;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

const NOTE = [
  "Read the transcript aloud in Norwegian bokmål with an Eastern Norwegian accent. Do not read these notes aloud.",
  "You are the calm, friendly voice of a Norwegian listening test, reading an instruction or a question to the candidate.",
  "Pace: clear and a little slower than normal, like a good teacher. Sound natural, not like a newsreader.",
].join("\n");

type Manifest = { voices: string | null; clips: string[] };

async function main() {
  if (!family.startsWith("gemini")) throw new Error("Use a Gemini voice, e.g. --voices=gemini-2.5-pro-tts.");
  const texts = [...new Set([...briefingSpeeches(), ...listeningTasks.flatMap((t) => t.questions.map((q) => q.prompt))])];
  const manifest: Manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : { voices: null, clips: [] };
  const fresh = force || manifest.voices !== family;
  const have = new Set(fresh ? [] : manifest.clips);
  const todo = texts.filter((t) => !have.has(narrationKey(t)) || !existsSync(path.join(DIR, `${narrationKey(t)}.mp3`)));
  console.log(`${todo.length} of ${texts.length} texts to record, ${todo.reduce((n, t) => n + t.length, 0).toLocaleString("en")} characters, ${family}.`);
  if (dryRun || !todo.length) return;

  await mkdir(DIR, { recursive: true });
  const clips = new Set(fresh ? [] : manifest.clips.filter((k) => texts.some((t) => narrationKey(t) === k)));
  const save = () =>
    writeFile(MANIFEST, JSON.stringify({ voices: family, clips: [...clips].sort() }, null, 2) + "\n");
  const failed: string[] = [];
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const text = todo[next++];
      const file = path.join(DIR, `${narrationKey(text)}.mp3`);
      let ok = false;
      try {
        for (let take = 0; take <= RETAKES && !ok; take++) {
          await writeFile(file, await synthesize({ text, prompt: NOTE, effect: undefined, voice: VOICE, pitch: 0, rate: 1, maxPause: 0.45 }));
          await addUsage(text.length);
          // Two passing checks in a row, as with --strict in check-audio.
          ok = (await check(file, text)).ok && (await check(file, text)).ok;
        }
      } catch (err) {
        // One text failing (a quota hiccup) shouldn't stop the rest; it is recorded on the next run.
        console.error(`skipped for now: ${text.slice(0, 50)} (${err instanceof Error ? err.message.slice(0, 120) : err})`);
      }
      if (ok) clips.add(narrationKey(text));
      else failed.push(text);
      if (++done % 25 === 0 || done === todo.length) {
        await save();
        console.log(`${done}/${todo.length} recorded, ${failed.length} not matching`);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  await save();

  // Remove recordings of texts that are gone or failed.
  const keep = new Set(clips);
  for (const f of await readdir(DIR)) if (!keep.has(f.replace(/\.mp3$/, ""))) await rm(path.join(DIR, f));
  console.log(`Done: ${clips.size} of ${texts.length} texts recorded.`);
  for (const t of failed) console.log(`- not matching after ${RETAKES} retakes: ${t}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
