"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { castVoices, effectFor, LEVEL_RATE, speakerOrder } from "@/lib/casting";
import {
  browserVoices,
  connectEffects,
  isRecorded,
  NATURAL_VOICE,
  pauseBefore,
  recordingUrl,
  wait,
  type Sound,
} from "@/lib/listening-audio";
import { useHydrated } from "@/lib/store";
import { useNorwegianVoices } from "@/lib/tts";
import type { ListeningTask } from "@/lib/types";
import { InteractiveText } from "./words/InteractiveText";

/** Playback speeds offered when practising. Tests always play at the exam speed. */
const SPEEDS = [0.75, 1, 1.25];

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
  const recorded = useMemo(() => isRecorded(task), [task]);
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
      el.src = recordingUrl(task, i);
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
            const speaker = several && <span className="font-semibold">{task.speakers[l.speaker]}: </span>;
            const text = (
              <>
                {speaker}
                {l.text}
              </>
            );
            const cls = `block w-full rounded-md px-2 py-1 text-left ${line === i ? "bg-ice" : ""}`;
            // Outside a test the words can be tapped, and a button plays just that line.
            return !limit ? (
              <div key={i} className={`flex items-start gap-2 ${cls}`}>
                {canPlay && (
                  <button
                    type="button"
                    disabled={playing}
                    onClick={() => void start(i, true)}
                    aria-label={`Spill av replikk ${i + 1}`}
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-fjord ring-1 ring-ice transition-colors hover:bg-ice disabled:opacity-40"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M2.5 1.5v7l6-3.5z" fill="currentColor" />
                    </svg>
                  </button>
                )}
                <p className="min-w-0 flex-1">
                  {speaker}
                  <InteractiveText text={l.text} taskId={task.id} block={i} />
                </p>
              </div>
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
