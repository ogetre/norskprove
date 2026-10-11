"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/store";
import { useNorwegianVoices } from "@/lib/tts";
import type { Level, ListeningTask } from "@/lib/types";

const RATE: Record<Level, number> = { A1: 0.82, A2: 0.88, B1: 0.95, B2: 1 };

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
  /** Enforce task.maxPlays, as in the exam. */
  limit: boolean;
  showTranscript?: boolean;
}) {
  const voices = useNorwegianVoices();
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const [fallbackText, setFallbackText] = useState(false);
  const cancelled = useRef(false);

  const hydrated = useHydrated();
  const [waited, setWaited] = useState(false);
  const supported = hydrated && "speechSynthesis" in window;
  // Voices load asynchronously; only call them missing after a short wait.
  const noVoice = hydrated && waited && (!supported || voices.length === 0);
  const used = limit && plays >= task.maxPlays;

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => () => {
      cancelled.current = true;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const play = () => {
    if (playing || used || !supported || voices.length === 0) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    cancelled.current = false;
    onPlay();
    setPlaying(true);

    const [voiceA, voiceB = voiceA] = voices;
    const sameVoice = voiceA === voiceB;

    const speak = (i: number) => {
      if (cancelled.current) return;
      if (i >= task.lines.length) {
        setPlaying(false);
        setLine(-1);
        return;
      }
      setLine(i);
      const l = task.lines[i];
      const u = new SpeechSynthesisUtterance(l.text);
      u.lang = "nb-NO";
      u.voice = (l.speaker === "A" ? voiceA : voiceB) ?? null;
      u.rate = RATE[task.level];
      // With a single voice, a lower pitch tells the second speaker apart.
      u.pitch = sameVoice ? (l.speaker === "A" ? 1.08 : 0.78) : 1;
      u.onend = () => setTimeout(() => speak(i + 1), 450);
      u.onerror = () => {
        setPlaying(false);
        setLine(-1);
      };
      synth.speak(u);
    };
    speak(0);
  };

  const stop = () => {
    cancelled.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setLine(-1);
  };

  const transcriptVisible = showTranscript || fallbackText;
  const progress = line < 0 ? 0 : (line + 1) / task.lines.length;

  return (
    <div className="rounded-xl bg-fjord-deep p-5 text-snow shadow-[0_24px_50px_-30px_rgb(15_43_60/0.7)] sm:p-6">
      <p className="text-sm text-mist">{task.situation}</p>

      <div className="mt-5 flex items-center gap-5">
        <button
          type="button"
          onClick={playing ? stop : play}
          disabled={(!playing && used) || !supported || voices.length === 0}
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
        <div className="mt-5 rounded-lg bg-surface p-4 text-[15px] leading-relaxed text-ink">
          {task.lines.map((l, i) => (
            <p key={i} className={i ? "mt-2" : ""}>
              {task.speakers.B && <span className="font-semibold">{task.speakers[l.speaker]}: </span>}
              {l.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
