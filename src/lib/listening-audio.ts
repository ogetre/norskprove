"use client";

import audio from "@/content/listening/audio.json";
import { audioKey, castVoices, effectFor, LEVEL_RATE, speakerOrder, type Cast, type Effect } from "./casting";
import type { ListeningTask, SpeakerId } from "./types";

/*
 * Playing listening tasks: the recordings made with `npm run audio`, their phone, loudspeaker
 * and radio effects, and the browser's own voices for tasks that aren't recorded. Shared by the
 * practice player and the exam, which plays the tasks by itself.
 */

/** Recorded tasks (npm run audio): task id → version of the text the recording was made from. */
const recordings = (audio as { tasks: Record<string, string> }).tasks;
/** The voices the recordings were made with; part of the URL so a browser never plays a cached older voice. */
const recordedWith = encodeURIComponent((audio as { voices: string | null }).voices ?? "");

/** Whether the task has a recording that matches its current text. */
export function isRecorded(task: ListeningTask): boolean {
  const version = recordings[task.id];
  return version !== undefined && version === audioKey(task);
}

export function recordingUrl(task: ListeningTask, line: number): string {
  return `/audio/lytting/${task.id}/${recordings[task.id]}-${line}.mp3?v=${recordedWith}`;
}

/** Pause before a line, a little longer when someone else starts talking. */
export function pauseBefore(task: ListeningTask, i: number): number {
  if (i === 0) return 0;
  return task.lines[i].speaker === task.lines[i - 1].speaker ? 300 : 550;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Sound effects for recordings ---------- */

export type Sound = { ctx: AudioContext; route: (effect: Effect | undefined) => void };

/**
 * Routes a recording through Web Audio so a line can sound like it comes through a phone, a
 * loudspeaker in a station hall or the radio. Null where Web Audio is missing; the recording
 * then plays as it is.
 */
export function connectEffects(el: HTMLAudioElement): Sound | null {
  try {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(el);
    const out = ctx.destination;
    const filter = (type: BiquadFilterType, frequency: number, gain = 0) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = frequency;
      f.gain.value = gain;
      return f;
    };
    const chain = (...nodes: AudioNode[]) => {
      nodes.reduce((a, b) => {
        a.connect(b);
        return b;
      });
      nodes[nodes.length - 1].connect(out);
      return nodes[0];
    };

    // A phone line only carries a narrow band of the voice.
    const phone = chain(filter("highpass", 320), filter("lowpass", 3300), filter("peaking", 1700, 6));

    // A loudspeaker in a hall: thin, with a short echo.
    const pa = filter("highpass", 220);
    const paTone = filter("lowpass", 4800);
    const echo = ctx.createDelay(1);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    echo.delayTime.value = 0.13;
    feedback.gain.value = 0.3;
    wet.gain.value = 0.35;
    pa.connect(paTone);
    paTone.connect(out);
    paTone.connect(echo);
    echo.connect(feedback);
    feedback.connect(echo);
    echo.connect(wet);
    wet.connect(out);

    // Radio: a little narrower and evened out.
    const radio = chain(filter("highpass", 90), filter("lowpass", 9000), ctx.createDynamicsCompressor());

    const inputs: Record<Effect, AudioNode> = { phone, pa, radio };
    return {
      ctx,
      route(effect) {
        source.disconnect();
        source.connect(effect ? inputs[effect] : out);
      },
    };
  } catch {
    return null;
  }
}

/* ---------- Browser voices, when a task isn't recorded yet ---------- */

const FEMALE_VOICE = /pernille|iselin|nora|hulda|ida|liv|female|kvinne/i;
const MALE_VOICE = /finn|jon|henrik|magnus|\bmale\b|\bmann\b/i;
/** Microsoft Edge has natural Norwegian voices (Pernille, Iselin, Finn) that sound far better. */
export const NATURAL_VOICE = /natural|online/i;

/** Only the natural voices when there are any, so a dialogue doesn't mix good and robotic voices. */
const best = (list: SpeechSynthesisVoice[]) => {
  const natural = list.filter((v) => NATURAL_VOICE.test(v.name));
  return natural.length ? natural : list;
};

export type BrowserVoice = { voice: SpeechSynthesisVoice; pitch: number };

/**
 * A browser voice for each speaker: a woman's or a man's voice when the browser has one. Speakers
 * who have to share a voice get a different pitch, so a dialogue never sounds like one person.
 */
export function browserVoices(task: ListeningTask, cast: Cast, voices: SpeechSynthesisVoice[]) {
  const female = best(voices.filter((v) => FEMALE_VOICE.test(v.name)));
  const male = best(voices.filter((v) => MALE_VOICE.test(v.name) && !FEMALE_VOICE.test(v.name)));
  const shared = new Map<string, number>();
  const result: Partial<Record<SpeakerId, BrowserVoice>> = {};
  for (const id of speakerOrder(task)) {
    const c = cast[id]!;
    const pool = c.gender === "kvinne" ? female : male;
    const list = pool.length ? pool : voices;
    const voice = list[c.index % list.length];
    const n = shared.get(voice.name) ?? 0;
    shared.set(voice.name, n + 1);
    const base = pool.length ? 1 : c.gender === "mann" ? 0.8 : 1.1;
    result[id] = { voice, pitch: base * [1, 0.86, 1.14][n % 3] };
  }
  return result;
}

/* ---------- The exam's sound, which plays tasks without the learner pressing play ---------- */

/** A tenth of a second of silence, to unlock the audio element inside a click. */
function silence(): string {
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
 * Plays tasks and spoken instructions one after another, the way the exam does. Browsers only
 * allow sound after the learner has done something, so `unlock` must run inside a click; after
 * that the exam can play on its own.
 */
export class ExamSound {
  private el: HTMLAudioElement | null = null;
  private sound: Sound | null | undefined = undefined;
  private run = 0;
  private end: (() => void) | null = null;

  unlock() {
    this.el ??= new Audio();
    if (this.sound === undefined) this.sound = connectEffects(this.el);
    void this.sound?.ctx.resume();
    this.el.src = silence();
    this.el.play().catch(() => undefined);
    if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }

  /** Stops whatever is playing; the promise of that playback resolves with false. */
  stop() {
    this.run++;
    this.end?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  close() {
    this.stop();
    this.el?.pause();
    void this.sound?.ctx.close();
  }

  private playFile(src: string, effect: Effect | undefined) {
    return new Promise<void>((resolve) => {
      const el = (this.el ??= new Audio());
      void this.sound?.ctx.resume();
      this.sound?.route(effect);
      el.src = src;
      el.playbackRate = 1;
      const done = () => {
        el.onended = el.onerror = null;
        this.end = null;
        resolve();
      };
      this.end = () => {
        el.pause();
        done();
      };
      el.onended = done;
      el.onerror = done;
      el.play().catch(done);
    });
  }

  private speak(text: string, voice: SpeechSynthesisVoice | null, rate: number, pitch = 1) {
    return new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "nb-NO";
      u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;
      const done = () => {
        this.end = null;
        resolve();
      };
      this.end = () => {
        window.speechSynthesis.cancel();
        done();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  }

  /** Plays the task once, or only its first `lines` lines. Resolves with false when it was stopped. */
  async playTask(
    task: ListeningTask,
    voices: SpeechSynthesisVoice[],
    onLine?: (line: number) => void,
    lines = task.lines.length,
  ): Promise<boolean> {
    const id = ++this.run;
    const recorded = isRecorded(task);
    const cast = castVoices(task);
    const speech = recorded ? {} : browserVoices(task, cast, voices);
    for (let i = 0; i < Math.min(lines, task.lines.length); i++) {
      if (i > 0) await wait(pauseBefore(task, i));
      if (id !== this.run) return false;
      onLine?.(i);
      const line = task.lines[i];
      if (recorded) await this.playFile(recordingUrl(task, i), effectFor(task, line.speaker));
      else {
        const v = speech[line.speaker];
        await this.speak(line.text, v?.voice ?? null, LEVEL_RATE[task.level] * cast[line.speaker]!.rate, v?.pitch);
      }
      if (id !== this.run) return false;
    }
    return true;
  }

  /** Reads an instruction aloud with the best Norwegian voice the browser has. */
  async say(text: string, voices: SpeechSynthesisVoice[]): Promise<boolean> {
    const id = ++this.run;
    const voice = best(voices.filter((v) => FEMALE_VOICE.test(v.name)))[0] ?? best(voices)[0] ?? null;
    if (!voice) {
      // No Norwegian voice: give the learner time to read the text instead.
      await wait(Math.min(12_000, text.length * 55));
      return id === this.run;
    }
    await this.speak(text, voice, 0.95);
    return id === this.run;
  }
}
