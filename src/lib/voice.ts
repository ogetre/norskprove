"use client";

import { narrationUrl } from "./narration";
import { speak, stopSpeaking } from "./tts";

/*
 * Norwegian read aloud in the site's own voices. Fixed texts (the examiner's questions, the example
 * answers, the listening exam's instructions and questions) are recorded in advance; anything else,
 * like the AI examiner's follow-ups, an AI model answer or a single word, comes from Google's voice
 * through api/tts. The browser's own voice is only the last resort, for example without an account.
 */

/** The examiner asks; the candidate gives the example answers. */
export type Speaker = "sensor" | "kandidat";

let el: HTMLAudioElement | null = null;
let end: (() => void) | null = null;
let run = 0;
const fetched = new Map<string, Promise<string | null>>();

const audio = () => (el ??= new Audio());

/** A tenth of a second of silence, to unlock the audio element inside a click. */
export function silence(): string {
  const samples = 2400;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}

/**
 * Browsers only play sound after the learner has done something. Called inside a click, it lets
 * later questions play on their own, also after waiting for the network.
 */
export function unlockVoice() {
  const a = audio();
  a.src = silence();
  a.play().catch(() => undefined);
}

function fromServer(text: string, speaker: Speaker, rate: number): Promise<string | null> {
  const key = `${speaker}:${rate}:${text}`;
  let url = fetched.get(key);
  if (!url) {
    url = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker, rate }),
    })
      .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : null))
      .catch(() => null);
    fetched.set(key, url);
    // A failure is tried again next time.
    void url.then((u) => u || fetched.delete(key));
  }
  return url;
}

function play(src: string): Promise<void> {
  return new Promise((resolve) => {
    const a = audio();
    const done = () => {
      a.onended = a.onerror = null;
      end = null;
      resolve();
    };
    end = () => {
      a.pause();
      done();
    };
    a.onended = done;
    a.onerror = done;
    a.src = src;
    a.play().catch(done);
  });
}

/** Reads the text aloud and resolves when it is done or stopped. `rate` is for what isn't recorded. */
export async function say(
  text: string,
  { speaker = "sensor", rate = 1, voice }: { speaker?: Speaker; rate?: number; voice?: SpeechSynthesisVoice } = {},
): Promise<void> {
  stopVoice();
  const id = run;
  const recorded = narrationUrl(text);
  if (recorded) return play(recorded);
  const url = await fromServer(text, speaker, rate);
  if (id !== run) return;
  return url ? play(url) : speak(text, { voice, rate });
}

export function stopVoice() {
  run++;
  end?.();
  stopSpeaking();
}
