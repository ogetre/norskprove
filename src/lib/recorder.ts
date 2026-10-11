"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Microphone recording with an optional live transcript (Web Speech API). */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canTranscribe(): boolean {
  return recognitionCtor() !== null;
}

export type Recording = { url: string | null; transcript: string; seconds: number };

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recog = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const startedAt = useRef(0);
  const resolveStop = useRef<((r: Recording) => void) | null>(null);

  const cleanup = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    try {
      recog.current?.stop();
    } catch {
      // already stopped
    }
    recog.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLive("");
    finalText.current = "";
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Vi fikk ikke tilgang til mikrofonen. Tillat mikrofon i nettleseren, eller skriv svaret i stedet.");
      return false;
    }

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const url = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })) : null;
      const transcript = finalText.current.trim();
      cleanup();
      setRecording(false);
      resolveStop.current?.({ url, transcript, seconds });
      resolveStop.current = null;
    };
    media.current = rec;

    const Ctor = recognitionCtor();
    if (Ctor) {
      const r = new Ctor();
      r.lang = "nb-NO";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText.current += res[0].transcript + " ";
          else interim += res[0].transcript;
        }
        setLive((finalText.current + interim).trim());
      };
      r.onerror = () => {};
      // Recognition stops after silence; restart it while we are still recording.
      r.onend = () => {
        if (media.current?.state === "recording" && recog.current === r) {
          try {
            r.start();
          } catch {
            // ignore
          }
        }
      };
      recog.current = r;
      try {
        r.start();
      } catch {
        recog.current = null;
      }
    }

    startedAt.current = Date.now();
    rec.start();
    setRecording(true);
    return true;
  }, [cleanup]);

  const stop = useCallback((): Promise<Recording> => {
    return new Promise((resolve) => {
      const rec = media.current;
      if (!rec || rec.state === "inactive") {
        resolve({ url: null, transcript: finalText.current.trim(), seconds: 0 });
        return;
      }
      resolveStop.current = resolve;
      try {
        recog.current?.stop();
      } catch {
        // ignore
      }
      // Give recognition a moment to deliver the last words.
      setTimeout(() => rec.stop(), 350);
    });
  }, []);

  return { start, stop, recording, error, live };
}
