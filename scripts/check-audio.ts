/*
 * Listens to the recorded listening tasks: Gemini on Vertex AI transcribes each line and says
 * whether it matches the script, so a voice that skips, repeats or adds words (such as reading
 * its director's note aloud) is caught without anyone listening to 600 files.
 *
 *   npm run audio:check -- --voices=gemini-2.5-pro-tts           report only
 *   npm run audio:check -- --voices=gemini-2.5-pro-tts --fix     records failed lines again, up to 3 times
 *   npm run audio:check -- --voices=gemini-2.5-pro-tts --only=pa-kafeen,hos-legen
 *   --strict   a line passes only when two checks in a row agree; one check now and then
 *              misses a small slip, so use it for retakes and the final pass
 *
 * --voices must be the voices the tasks were recorded with (audio.json), so retakes match.
 * Needs a service account (GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS) with Vertex AI User.
 * The result is written to .audio-check.json.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listeningTasks } from "../src/content/listening";
import { audioKey } from "../src/lib/casting";
import { addUsage, family, measure, plan, readManifest, synthesize, voicePools, writeManifest } from "./generate-audio";
import { accessToken, projectId } from "../src/lib/google-auth";

const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public/audio/lytting");
const MANIFEST = path.join(ROOT, "src/content/listening/audio.json");
const REPORT = path.join(ROOT, ".audio-check.json");
const MODEL = "gemini-2.5-flash";
const WORKERS = 6;
const RETAKES = 3;

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");
const strict = args.includes("--strict");

export type Verdict = { ok: boolean; heard: string; problem: string };

const prompt = (script: string) => `This is a recording of one line from a Norwegian listening exercise. The script for the line is:
"${script}"

Write what is said in "heard". Set "ok" to false if the recording leaves out or changes words, repeats a part, or says anything that is not in the script, such as English instructions or notes about the scene or the speaker. Ignore punctuation, whether numbers are said as digits or words, spelling variants that bokmål allows, and small natural fillers like "eh", "å" or "åh". In "problem", say briefly what is wrong, or leave it empty.`;

export async function check(file: string, script: string): Promise<Verdict> {
  const url = `https://aiplatform.googleapis.com/v1/projects/${await projectId()}/locations/global/publishers/google/models/${MODEL}:generateContent`;
  const audio = (await readFile(file)).toString("base64");
  for (let attempt = 1; ; attempt++) {
    // A dropped connection is retried like a busy server.
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/mpeg", data: audio } }, { text: prompt(script) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { heard: { type: "STRING" }, ok: { type: "BOOLEAN" }, problem: { type: "STRING" } },
            required: ["heard", "ok", "problem"],
          },
        },
      }),
    }).catch((err: unknown) => {
      if (attempt < 6) return null;
      throw err;
    });
    if (!res || ((res.status === 429 || res.status >= 500) && attempt < 6)) {
      await new Promise((r) => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
      continue;
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message: string } };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) throw new Error(`Vertex AI answered ${res.status}: ${data.error?.message ?? "no text"}`);
    return JSON.parse(text) as Verdict;
  }
}

/** One verdict, or two in a row with --strict; the first failure is returned. */
async function verify(file: string, script: string): Promise<Verdict> {
  const first = await check(file, script);
  return first.ok && strict ? check(file, script) : first;
}

async function main() {
  if (!(await accessToken())) throw new Error("Needs a service account: set GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as { voices: string | null; tasks: Record<string, string> };
  if (manifest.voices !== family) {
    throw new Error(`The tasks were recorded with ${manifest.voices}; run with --voices=${manifest.voices} so retakes match.`);
  }
  const pools = fix ? await voicePools() : null;

  const items = listeningTasks
    .filter((t) => (!only || only.includes(t.id)) && manifest.tasks[t.id] === audioKey(t))
    .flatMap((task) => task.lines.map((line, i) => ({ task, i, file: path.join(AUDIO_DIR, task.id, `${manifest.tasks[task.id]}-${i}.mp3`) })));
  console.log(`Checking ${items.length} lines with ${MODEL}${fix ? ", recording failed lines again" : ""}.`);

  const failed: { line: string; script: string; heard: string; problem: string }[] = [];
  let fixed = 0;
  const retaken = new Set<(typeof items)[number]["task"]>();
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const { task, i, file } = items[next++];
      const script = task.lines[i].text;
      let verdict = await verify(file, script);
      for (let take = 1; !verdict.ok && fix && take <= RETAKES; take++) {
        const p = plan(task, pools!)[i];
        await writeFile(file, await synthesize(p));
        await addUsage(p.text.length);
        retaken.add(task);
        verdict = await verify(file, script);
        if (verdict.ok) fixed++;
      }
      if (!verdict.ok) failed.push({ line: `${task.id}#${i}`, script, heard: verdict.heard, problem: verdict.problem });
      if (++done % 50 === 0) console.log(`${done}/${items.length} checked, ${failed.length} not matching${fix ? `, ${fixed} fixed` : ""}`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  if (retaken.size) {
    // A retake is a little longer or shorter, and the player's progress bar goes by the lengths.
    const m = await readManifest();
    for (const task of retaken) m.durations[task.id] = measure(task, m.tasks[task.id]);
    await writeManifest(m);
  }

  await writeFile(REPORT, JSON.stringify({ voices: family, checked: items.length, fixed, failed }, null, 2) + "\n");
  console.log(`Done: ${items.length} lines, ${fixed} recorded again, ${failed.length} still not matching. Details in .audio-check.json.`);
  for (const f of failed) console.log(`- ${f.line}: ${f.problem}`);
}

if (process.argv[1]?.endsWith("check-audio.ts")) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
