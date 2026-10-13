"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import audio from "@/content/listening/audio.json";
import { audioKey, castVoices, effectFor, LEVEL_RATE, speakerOrder, type Cast, type Effect } from "@/lib/casting";
import { useHydrated } from "@/lib/store";
import { useNorwegianVoices } from "@/lib/tts";
import type { ListeningTask, SpeakerId } from "@/lib/types";

/** Recorded tasks (npm run audio): task id → version of the text the recording was made from. */
const recordings = (audio as { tasks: Record<string, string> }).tasks;

/** Playback speeds offered when practising. Tests always play at the exam speed. */
const SPEEDS = [0.75, 1, 1.25];

/** Pause before a line, a little longer when someone else starts talking. */
function pauseBefore(task: ListeningTask, i: number): number {
  if (i === 0) return 0;
  return task.lines[i].speaker === task.lines[i - 1].speaker ? 300 : 550;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Sound effects for recordings ---------- */

type Sound = { ctx: AudioContext; route: (effect: Effect | undefined) => void };

/**
 * Routes a recording through Web Audio so a line can sound like it comes through a phone, a
 * loudspeaker in a station hall or the radio. Null where Web Audio is missing; the recording
 * then plays as it is.
 */
function connectEffects(el: HTMLAudioElement): Sound | null {
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
const NATURAL_VOICE = /natural|online/i;

/** Only the natural voices when there are any, so a dialogue doesn't mix good and robotic voices. */
const best = (list: SpeechSynthesisVoice[]) => {
  const natural = list.filter((v) => NATURAL_VOICE.test(v.name));
  return natural.length ? natural : list;
};

type BrowserVoice = { voice: SpeechSynthesisVoice; pitch: number };

/**
 * A browser voice for each speaker: a woman's or a man's voice when the browser has one. Speakers
 * who have to share a voice get a different pitch, so a dialogue never sounds like one person.
 */
function browserVoices(task: ListeningTask, cast: Cast, voices: SpeechSynthesisVoice[]) {
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

/* ---------- Player ---------- */

export function ListeningPlayer({
  task,
  plays,
  onPlay,
  limit,
  showTranscript = false,
}: {
  task: ListeningTask;
  /** Times played so far (kept by the parent so it survives navigation in a test). */
  plays: number;
  onPlay: () => void;
  /** Enforce task.maxPlays and the exam speed, as in the exam. */
  limit: boolean;
  showTranscript?: boolean;
}) {
  const voices = useNorwegianVoices();
  const hydrated = useHydrated();
  const cast = useMemo(() => castVoices(task), [task]);
  const version = recordings[task.id];
  const recorded = useMemo(() => version !== undefined && version === audioKey(task), [task, version]);
  const speech = useMemo(() => (voices.length ? browserVoices(task, cast, voices) : {}), [task, cast, voices]);
  const several = speakerOrder(task).length > 1;

  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const [lastLine, setLastLine] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [fallbackText, setFallbackText] = useState(false);
  const [waited, setWaited] = useState(false);

  const run = useRef(0);
  const speedRef = useRef(1);
  const element = useRef<HTMLAudioElement | null>(null);
  const sound = useRef<Sound | null | undefined>(undefined);
  /** Ends the line that is playing right now. */
  const endLine = useRef<(() => void) | null>(null);

  const speechReady = hydrated && "speechSynthesis" in window && voices.length > 0;
  const canPlay = recorded || speechReady;
  // Browser voices load asynchronously; only call them missing after a short wait.
  const noVoice = hydrated && waited && !canPlay;
  const robotic = !recorded && speechReady && !voices.some((v) => NATURAL_VOICE.test(v.name));
  const used = limit && plays >= task.maxPlays;

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const runs = run;
    const end = endLine;
    const el = element;
    const fx = sound;
    return () => {
      runs.current++;
      end.current?.();
      el.current?.pause();
      void fx.current?.ctx.close();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const playRecorded = (i: number) =>
    new Promise<void>((resolve) => {
      const el = (element.current ??= new Audio());
      if (sound.current === undefined) sound.current = connectEffects(el);
      void sound.current?.ctx.resume();
      sound.current?.route(effectFor(task, task.lines[i].speaker));
      el.src = `/audio/lytting/${task.id}/${version}-${i}.mp3`;
      el.defaultPlaybackRate = speedRef.current;
      el.playbackRate = speedRef.current;
      const done = () => {
        el.onended = el.onerror = null;
        endLine.current = null;
        resolve();
      };
      endLine.current = () => {
        el.pause();
        done();
      };
      el.onended = done;
      el.onerror = done;
      el.play().catch(done);
    });

  const playSpeech = (i: number) =>
    new Promise<void>((resolve) => {
      const l = task.lines[i];
      const v = speech[l.speaker];
      const u = new SpeechSynthesisUtterance(l.text);
      u.lang = "nb-NO";
      u.voice = v?.voice ?? null;
      u.pitch = v?.pitch ?? 1;
      u.rate = LEVEL_RATE[task.level] * cast[l.speaker]!.rate * speedRef.current;
      const done = () => {
        endLine.current = null;
        resolve();
      };
      endLine.current = () => {
        window.speechSynthesis.cancel();
        done();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });

  /** Plays from line `from` to the end, or only that line. */
  const start = async (from: number, only = false) => {
    if (playing || !canPlay || (!only && used)) return;
    const id = ++run.current;
    if (!only) onPlay();
    if (!recorded) window.speechSynthesis.cancel();
    setPlaying(true);
    for (let i = from; i < task.lines.length; i++) {
      if (i > from) await wait(pauseBefore(task, i));
      if (id !== run.current) return;
      setLine(i);
      setLastLine(i);
      await (recorded ? playRecorded(i) : playSpeech(i));
      if (id !== run.current) return;
      if (only) break;
    }
    setPlaying(false);
    setLine(-1);
  };

  const stop = () => {
    run.current++;
    endLine.current?.();
    setPlaying(false);
    setLine(-1);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    speedRef.current = s;
    if (element.current) element.current.playbackRate = s;
  };

  const transcriptVisible = showTranscript || fallbackText;
  const progress = line < 0 ? 0 : (line + 1) / task.lines.length;

  return (
    <div className="rounded-xl bg-fjord-deep p-5 text-snow shadow-[0_24px_50px_-30px_rgb(15_43_60/0.7)] sm:p-6">
      <p className="text-sm text-mist">{task.situation}</p>

      <div className="mt-5 flex items-center gap-5">
        <button
          type="button"
          onClick={playing ? stop : () => void start(0)}
          disabled={(!playing && used) || !canPlay}
          aria-label={playing ? "Stopp opptaket" : "Spill av opptaket"}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-rorbu text-white shadow-lg transition-[background-color,transform] hover:bg-[#a03022] active:scale-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:shadow-none"
        >
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="5" y="4" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="13" y="4" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
            {Array.from({ length: 32 }, (_, i) => (
              <span
                key={i}
                className={`w-1 rounded-full ${playing ? "wave-bar bg-[#7fe0b8]" : "bg-white/25"}`}
                style={{
                  height: `${30 + ((i * 37) % 60)}%`,
                  animationDelay: `${(i % 8) * 90}ms`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#7fe0b8] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-mist" aria-live="polite">
            {playing
              ? "Spiller av …"
              : limit
                ? used
                  ? `Du har hørt opptaket ${task.maxPlays} ganger.`
                  : `Du kan høre opptaket ${task.maxPlays - plays} ${task.maxPlays - plays === 1 ? "gang" : "ganger"} til.`
                : plays > 0
                  ? "Du kan høre opptaket så mange ganger du vil."
                  : "Trykk for å høre opptaket."}
          </p>
        </div>
      </div>

      {!limit && canPlay && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
          <div role="group" aria-label="Hastighet" className="flex rounded-md bg-white/10 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => changeSpeed(s)}
                className="rounded px-2.5 py-1 tabular-nums text-mist transition-colors hover:text-snow aria-pressed:bg-surface aria-pressed:text-ink"
              >
                {String(s).replace(".", ",")}×
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={playing || lastLine < 0}
            onClick={() => void start(lastLine, true)}
            className="rounded-md px-3 py-1.5 text-mist ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-snow disabled:opacity-40"
          >
            ↺ Hør replikken igjen
          </button>
        </div>
      )}

      {robotic && (
        <p className="mt-4 text-xs text-mist">Tips: I Microsoft Edge hører du mer naturlige norske stemmer.</p>
      )}

      {noVoice && !transcriptVisible && (
        <div className="mt-5 rounded-lg bg-white/10 p-4 text-sm leading-relaxed">
          <p className="font-medium">Nettleseren din har ingen norsk stemme.</p>
          <p className="mt-1 text-mist">
            Bruk Microsoft Edge, Safari eller Chrome på mobil for å høre opptaket. Du kan også lese teksten i stedet.
          </p>
          <button
            type="button"
            onClick={() => setFallbackText(true)}
            className="mt-3 rounded-md bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25"
          >
            Les teksten i stedet
          </button>
        </div>
      )}

      {transcriptVisible && (
        <div className="mt-5 rounded-lg bg-surface p-2 text-[15px] leading-relaxed text-ink">
          {task.lines.map((l, i) => {
            const text = (
              <>
                {several && <span className="font-semibold">{task.speakers[l.speaker]}: </span>}
                {l.text}
              </>
            );
            const cls = `block w-full rounded-md px-2 py-1 text-left ${line === i ? "bg-ice" : ""}`;
            // Outside a test, tapping a line plays just that line.
            return !limit && canPlay ? (
              <button key={i} type="button" disabled={playing} onClick={() => void start(i, true)} className={`${cls} hover:bg-ice/60`}>
                {text}
              </button>
            ) : (
              <p key={i} className={cls}>
                {text}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
