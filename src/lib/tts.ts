"use client";

import { useSyncExternalStore } from "react";

/* Norwegian text-to-speech with the browser's Web Speech API. */

let voiceCache: SpeechSynthesisVoice[] | null = null;

function norwegianVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const nor = window.speechSynthesis
    .getVoices()
    .filter((v) => /^(nb|no|nn)\b/i.test(v.lang) || /norw|norsk|bokmål/i.test(v.name));
  // Natural/online voices sound far better than the old local ones.
  return nor.sort((a, b) => Number(/natural|online/i.test(b.name)) - Number(/natural|online/i.test(a.name)));
}

function subscribeVoices(cb: () => void) {
  if (!("speechSynthesis" in window)) return () => {};
  const onChange = () => {
    voiceCache = null;
    cb();
  };
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  // Some browsers fill the list after a short delay without firing the event.
  const t = setTimeout(onChange, 1200);
  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", onChange);
    clearTimeout(t);
  };
}

function voicesSnapshot() {
  voiceCache ??= norwegianVoices();
  return voiceCache;
}

const EMPTY: SpeechSynthesisVoice[] = [];

export function useNorwegianVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, voicesSnapshot, () => EMPTY);
}

export function speak(
  text: string,
  { voice, rate = 0.95, pitch = 1 }: { voice?: SpeechSynthesisVoice; rate?: number; pitch?: number } = {},
): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nb-NO";
    u.voice = voice ?? voicesSnapshot()[0] ?? null;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
