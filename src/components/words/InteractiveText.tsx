"use client";

import { useEffect, useState } from "react";
import { isRtl } from "@/lib/languages";
import { useNativeLanguage } from "@/lib/native-language";
import { fetchTranslation, useWordLookup } from "./WordLookup";

// Words are letters with inner apostrophes or hyphens ("e-post"); the split keeps them at odd indexes.
const WORD = /([\p{L}][\p{L}'’-]*)/u;

/** A text whose words can be tapped for the word card; plain text outside a WordLookupProvider. */
export function InteractiveText({ text, taskId, block }: { text: string; taskId: string; block: number }) {
  const open = useWordLookup();
  if (!open) return <>{text}</>;
  return (
    <>
      {text.split(WORD).map((part, i) =>
        i % 2 ? (
          <button
            key={i}
            type="button"
            onClick={(e) =>
              open({ taskId, block, word: part, rect: e.currentTarget.getBoundingClientRect(), button: e.currentTarget })
            }
            className="cursor-pointer rounded-[3px] underline decoration-ice decoration-1 underline-offset-[5px] transition-colors hover:bg-ice hover:decoration-mist focus-visible:bg-ice focus-visible:outline-none"
          >
            {part}
          </button>
        ) : (
          part
        ),
      )}
    </>
  );
}

function TranslateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.5 4.5h8M6.5 3v1.5M4 4.5c.6 2.6 2.3 4.7 5 6M9 4.5c-.7 3-2.6 5.5-5.5 6.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 17l3.25-8 3.25 8M11.6 14.3h4.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A paragraph with tappable words and a button that shows it in the learner's language. */
export function InteractiveParagraph({
  text,
  taskId,
  block,
  className = "",
}: {
  text: string;
  taskId: string;
  block: number;
  className?: string;
}) {
  const [lang] = useNativeLanguage();
  const [shown, setShown] = useState(false);
  const reqKey = `${lang}|${taskId}|${block}`;
  const [result, setResult] = useState<{ key: string; text?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!shown) return;
    let cancelled = false;
    fetchTranslation(lang, taskId, block).then(
      (t) => !cancelled && setResult({ key: reqKey, text: t }),
      (err: Error) => !cancelled && setResult({ key: reqKey, error: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [shown, lang, taskId, block, reqKey]);

  const current = result?.key === reqKey ? result : null;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1">
          <InteractiveText text={text} taskId={taskId} block={block} />
        </p>
        <button
          type="button"
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Skjul oversettelsen" : "Oversett avsnittet"}
          title={shown ? "Skjul oversettelsen" : "Oversett avsnittet"}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-granite ring-1 ring-ice transition-colors hover:bg-ice hover:text-ink aria-pressed:bg-ink aria-pressed:text-snow aria-pressed:ring-ink"
        >
          <TranslateIcon />
        </button>
      </div>
      {shown && (
        <div className="mt-2 rounded-lg bg-snow px-4 py-3 text-[15px] leading-relaxed" aria-live="polite">
          {!current && <div className="h-3.5 w-2/3 animate-pulse rounded bg-ice" aria-label="Oversetter" />}
          {current?.error && <p className="text-granite">{current.error}</p>}
          {current?.text && (
            <p lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} className="text-granite">
              {current.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
