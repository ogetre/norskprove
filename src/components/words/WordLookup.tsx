"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isRtl, LANGUAGES, type LanguageCode } from "@/lib/languages";
import { useNativeLanguage } from "@/lib/native-language";
import { saveWord, useAppState } from "@/lib/store";
import { say, unlockVoice } from "@/lib/voice";
import type { WordEntry } from "@/lib/types";

type Target = { taskId: string; block: number; word: string; rect: DOMRect; button: HTMLElement };

async function postJson<T>(url: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Fikk ikke kontakt med serveren.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? "Noe gikk galt. Prøv igjen.");
  return data;
}

// Answers kept for the visit, so a word looked up twice opens at once.
const entries = new Map<string, Promise<WordEntry>>();
const translations = new Map<string, Promise<string>>();

function remember<T>(map: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  let p = map.get(key);
  if (!p) {
    p = load();
    map.set(key, p);
    p.catch(() => map.delete(key));
  }
  return p;
}

function fetchEntry(lang: LanguageCode, taskId: string, block: number, word: string) {
  return remember(entries, [lang, taskId, block, word.toLowerCase()].join("|"), () =>
    postJson<{ entry: WordEntry }>("/api/words/lookup", { taskId, block, word, lang }).then((d) => d.entry),
  );
}

export function fetchTranslation(lang: LanguageCode, taskId: string, block: number) {
  return remember(translations, [lang, taskId, block].join("|"), () =>
    postJson<{ translation: string }>("/api/words/translate", { taskId, block, lang }).then((d) => d.translation),
  );
}

const LookupContext = createContext<((t: Target) => void) | null>(null);

/** Opens the word card for a word in a text; null outside a WordLookupProvider. */
export function useWordLookup() {
  return useContext(LookupContext);
}

/** Lets the words of the texts inside be tapped for a dictionary card. */
export function WordLookupProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <LookupContext.Provider value={setTarget}>
      {children}
      {target && (
        <WordCard
          key={`${target.taskId}-${target.block}-${target.word}-${target.rect.top}`}
          target={target}
          onClose={(refocus) => {
            if (refocus) target.button.focus();
            setTarget(null);
          }}
        />
      )}
    </LookupContext.Provider>
  );
}

export function LanguagePicker({ id }: { id: string }) {
  const [lang, setLang] = useNativeLanguage();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-granite">
      Oversett til
      <select
        id={id}
        value={lang}
        onChange={(e) => setLang(e.target.value as LanguageCode)}
        className="rounded-md border border-ice bg-surface px-2 py-1 text-ink focus:border-fjord focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
      <path d="M13 7a4 4 0 010 6M15.5 4.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WordCard({ target, onClose }: { target: Target; onClose: (refocus: boolean) => void }) {
  const [lang] = useNativeLanguage();
  const [round, setRound] = useState(0);
  const reqKey = `${lang}|${round}`;
  const [result, setResult] = useState<{ key: string; entry?: WordEntry; error?: string } | null>(null);
  const words = useAppState().words ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const [mobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    let cancelled = false;
    fetchEntry(lang, target.taskId, target.block, target.word).then(
      (entry) => !cancelled && setResult({ key: reqKey, entry }),
      (err: Error) => !cancelled && setResult({ key: reqKey, error: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [lang, reqKey, target]);

  // The latest onClose, so the listeners below are added once and focus is not moved again.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current(true);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && closeRef.current(false);
    // A card next to the word would drift away from it when the page scrolls.
    const onScroll = () => !mobile && closeRef.current(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mobile]);

  const current = result?.key === reqKey ? result : null;
  const entry = current?.entry;
  const id = entry ? `${entry.lemma.toLowerCase()}|${entry.pos}` : "";
  const saved = entry ? words.some((w) => w.id === id) : false;

  const W = 360;
  const below = window.innerHeight - target.rect.bottom > 380;
  const style = mobile
    ? undefined
    : {
        width: W,
        left: Math.min(Math.max(target.rect.left - 24, 12), window.innerWidth - W - 12),
        ...(below ? { top: target.rect.bottom + 8 } : { bottom: window.innerHeight - target.rect.top + 8 }),
      };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Ordet «${target.word}»`}
      tabIndex={-1}
      style={style}
      className={`fixed z-50 max-h-[70vh] overflow-y-auto bg-surface text-ink shadow-[0_24px_60px_-20px_rgb(15_43_60/0.5)] ring-1 ring-ice focus:outline-none ${
        mobile ? "inset-x-0 bottom-0 rounded-t-2xl p-5 pb-8" : "rounded-2xl p-5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-medium tracking-tight">{target.word}</span>
            <button
              type="button"
              onClick={() => {
                unlockVoice();
                void say(target.word, { rate: 0.85 });
              }}
              aria-label={`Hør «${target.word}»`}
              className="grid size-8 place-items-center rounded-full text-fjord ring-1 ring-ice transition-colors hover:bg-ice"
            >
              <SpeakerIcon />
            </button>
            {entry && <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-granite">{entry.pos}</span>}
          </div>
          {entry && entry.lemma.toLowerCase() !== target.word.toLowerCase() && (
            <p className="mt-1 text-sm text-granite">
              Grunnform: <span className="font-semibold text-ink">{entry.lemma}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(true)}
          aria-label="Lukk"
          className="grid size-8 shrink-0 place-items-center rounded-full text-granite hover:bg-ice hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!current && (
        <div className="mt-4 space-y-2.5" aria-busy="true" aria-label="Slår opp ordet">
          {[70, 90, 55].map((w) => (
            <div key={w} className="h-3.5 animate-pulse rounded bg-ice" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {current?.error && (
        <div className="mt-4 text-sm">
          <p className="text-granite">{current.error}</p>
          <button type="button" onClick={() => setRound((r) => r + 1)} className="mt-2 font-medium text-fjord underline-offset-4 hover:underline">
            Prøv igjen
          </button>
        </div>
      )}

      {entry && (
        <div className="mt-3">
          <p lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="text-xl font-semibold">
            {entry.translation}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-granite">{entry.meaning_no}</p>

          {entry.forms.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {entry.forms.map((f) => (
                <div key={f.label} className="rounded-lg bg-snow px-3 py-2">
                  <dt className="text-[11px] font-semibold tracking-wide text-granite uppercase">{f.label}</dt>
                  <dd className="font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {entry.example && (
            <div className="mt-4 rounded-lg bg-snow px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-granite uppercase">Eksempel</p>
              <p className="mt-0.5">{entry.example}</p>
              <p lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="mt-0.5 text-sm text-granite italic">
                {entry.example_translation}
              </p>
            </div>
          )}

          {entry.note && (
            <p lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="mt-3 rounded-lg bg-note px-3 py-2 text-sm text-note-ink">
              {entry.note}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ice pt-3">
        <LanguagePicker id={`lang-${target.taskId}-${target.block}`} />
        {entry &&
          (saved ? (
            <span className="text-sm font-medium text-moss">✓ Lagret i Mine ord</span>
          ) : (
            <button
              type="button"
              onClick={() =>
                saveWord({ ...entry, id, word: target.word, lang, taskId: target.taskId, at: new Date().toISOString() })
              }
              className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-snow transition-colors hover:bg-fjord"
            >
              Lagre ordet
            </button>
          ))}
      </div>
    </div>
  );
}
