/*
 * Draws the pictures for the oral test's picture task («Beskriv et bilde»), where the candidate
 * sees a scene with several people doing different things and talks about it. Gemini's image
 * model on Vertex AI draws each scene once; the tasks in src/content/speaking/bilder.ts are
 * written from what the pictures actually show, so a picture is only drawn again on request.
 *
 *   npm run pictures -- --dry-run
 *   npm run pictures                          draws the scenes that have no picture yet
 *   npm run pictures -- --only=parken --force draws a scene again
 *
 * Needs a service account like the Gemini voices (GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS).
 * Each picture costs about 4 cents of Google Cloud credit. Saved as public/images/muntlig/<id>.webp.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { accessToken, projectId } from "../src/lib/google-auth";

const MODEL = "gemini-2.5-flash-image";
const DIR = path.resolve(__dirname, "../public/images/muntlig");

const STYLE =
  "Flat, friendly editorial illustration in soft colours, like a picture in a Norwegian language exam. Clear, uncluttered composition where every person and action is easy to see. Landscape. Absolutely no text, letters, numbers, logos or writing anywhere, also not on signs, screens, packages or clothes.";

/** The scenes: a place in Norway with several people, each doing something different. */
export const SCENES: Record<string, string> = {
  parken:
    "A busy park in Norway on a sunny summer day. A man jogging on the path, a woman walking a golden dog, an old woman feeding pigeons on a bench, a family having a picnic on a blanket, two children playing football, a red kite in the sky.",
  kjokkenet:
    "A bright family kitchen in the evening. A mother stirring a pot on the stove, a father setting plates on the table, a girl drawing at the table, a grandfather reading a newspaper in a chair, a cat sleeping on the windowsill.",
  butikken:
    "Inside a small supermarket. A woman paying with a card at the checkout, a cashier smiling, a man choosing apples in the fruit section, a boy holding a carton of milk, an employee filling shelves with bread.",
  stranden:
    "A Norwegian beach on a warm summer day with fjord and mountains behind. People swimming in the water, a girl building a sandcastle with a bucket, a man reading a book under a parasol, a woman putting sunscreen on a small child, two teenagers playing volleyball.",
  vinter:
    "A snowy winter day in a Norwegian residential street. Two children sledging down a small hill, a man shovelling snow in front of his house, a woman on cross-country skis, a couple building a snowman, a boy throwing a snowball.",
  bussholdeplassen:
    "A rainy autumn morning at a bus stop in a Norwegian town. A woman with an umbrella and a pram, a man in a suit looking at his phone, a student with a backpack running towards the bus, an old man sitting on the bench, a red bus arriving.",
  venterommet:
    "A doctor's waiting room. A man with his arm in a sling, a mother rocking a crying baby, an old man reading a magazine, a receptionist talking on the phone behind the desk, a teenager with headphones looking bored, a clock on the wall.",
  kontoret:
    "An open-plan office. Three colleagues in a meeting around a table with a laptop, a woman who has just spilled coffee on her papers, a man talking on the phone by the window, colleagues giving a birthday cake with candles to a smiling woman.",
  flytting:
    "Moving day outside an apartment building in Norway. A van with its doors open, a couple carrying a sofa together, a neighbour helping to carry boxes, a girl carrying a potted plant, an old woman watching from a balcony.",
  kafeen:
    "A busy, cosy café. A barista making coffee behind the counter, two friends laughing at a table, a man working on a laptop, a waiter who has dropped a tray with cups, a woman reading a book by the window. No menu boards or chalkboards on the walls, only plants and lamps.",
  togstasjonen:
    "A train station platform in Norway. A train arriving, people waiting with suitcases, a man running with a suitcase, a woman helping a confused tourist with a paper map, a family saying goodbye with hugs, a station clock.",
  dugnad:
    "A Norwegian dugnad (volunteer clean-up day) in the shared garden of an apartment building in spring. Neighbours raking leaves, a man painting a fence, children picking up rubbish into bags, a woman serving coffee and waffles from a table, an old man planting flowers.",
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");

async function draw(scene: string): Promise<Buffer> {
  const url = `https://aiplatform.googleapis.com/v1/projects/${await projectId()}/locations/global/publishers/google/models/${MODEL}:generateContent`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${scene}\n\n${STYLE}` }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } },
      }),
    }).catch(() => null);
    if (!res || ((res.status === 429 || res.status >= 500) && attempt < 5)) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[];
      error?: { message: string };
    };
    const image = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!image) throw new Error(`Vertex AI answered ${res.status}: ${data.error?.message ?? "no picture"}`);
    return Buffer.from(image, "base64");
  }
}

async function main() {
  const todo = Object.keys(SCENES).filter((id) => (!only || only.includes(id)) && (force || !existsSync(path.join(DIR, `${id}.webp`))));
  console.log(`${todo.length} of ${Object.keys(SCENES).length} pictures to draw with ${MODEL}.`);
  if (dryRun || !todo.length) return;
  if (!(await accessToken())) throw new Error("Needs a service account: set GOOGLE_SA_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
  await mkdir(DIR, { recursive: true });
  for (const id of todo) {
    const png = path.join(DIR, `${id}.png`);
    await writeFile(png, await draw(SCENES[id]));
    // WebP at this size is about a tenth of the PNG.
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-vf", "scale=1200:-2", "-c:v", "libwebp", "-quality", "80", path.join(DIR, `${id}.webp`)]);
    await rm(png);
    console.log(`drew ${id}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
