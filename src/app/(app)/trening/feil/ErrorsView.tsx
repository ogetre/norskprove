"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  collectDrills,
  drillKind,
  LEARNT_INTERVAL,
  matches,
  options,
  shuffled,
  splitWords,
  type Drill,
  type DrillKind,
} from "@/lib/error-drills";
import { topicName } from "@/lib/feedback-topics";
import { textLang } from "@/lib/languages";
import { reviewQueue, schedule } from "@/lib/srs";
import { dayKey, reviewCard, useAppState, useHydrated } from "@/lib/store";

/** Exercises a topic round takes at most. */
const TOPIC_ROUND = 15;

const INSTRUCTIONS: Record<DrillKind, string> = {
  choose: "Hva er riktig?",
  order: "Sett ordene i riktig rekkefølge",
  write: "Rett det som er markert",
};

function Sentence({ drill, children }: { drill: Drill; children: ReactNode }) {
  return (
    <p className="text-xl leading-loose sm:text-2xl">
      {drill.before}
      {children}
      {drill.after}
    </p>
  );
}

function Blank() {
  return (
    <span className="mx-0.5 inline-block w-20 translate-y-1 border-b-2 border-fjord">
      <span className="sr-only">tomt felt</span>&nbsp;
    </span>
  );
}

type Answer = { correct: boolean; given: string };

/** One card: the learner answers, sees the correct sentence and why, then moves on. */
function DrillCard({ drill, kind, onNext }: { drill: Drill; kind: DrillKind; onNext: (correct: boolean) => void }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [typed, setTyped] = useState("");
  const tokens = useMemo(() => shuffled(drill), [drill]);
  const [picked, setPicked] = useState<number[]>([]);
  const [first, second] = options(drill);
  const hasContext = Boolean(drill.before || drill.after);

  const choose = (given: string) => setAnswer({ correct: given === drill.correction, given });
  const checkOrder = () => {
    const given = picked.map((i) => tokens[i]).join(" ");
    setAnswer({ correct: given === splitWords(drill.correction).join(" "), given });
  };
  const checkTyped = () => typed.trim() && setAnswer({ correct: matches(typed, drill), given: typed.trim() });

  useEffect(() => {
    if (answer || kind !== "choose") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1" || e.key === "2") choose(e.key === "1" ? first : second);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let middle: ReactNode;
  if (answer) {
    middle = <strong className="font-semibold text-moss">{drill.correction}</strong>;
  } else if (kind === "write") {
    middle = <span className="rounded-sm bg-rorbu/10 underline decoration-rorbu decoration-wavy underline-offset-4">{drill.original}</span>;
  } else if (kind === "order") {
    middle = (
      <span className="mx-0.5 inline-flex min-h-11 min-w-24 flex-wrap items-center gap-1.5 rounded-lg border-2 border-dashed border-ice px-1.5 py-1 align-middle">
        {picked.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPicked((p) => p.filter((x) => x !== i))}
            className="rounded-md bg-fjord-deep px-2.5 py-1 text-lg text-snow"
          >
            {tokens[i]}
          </button>
        ))}
      </span>
    );
  } else {
    middle = <Blank />;
  }

  return (
    <div className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{INSTRUCTIONS[kind]}</p>
        <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-granite">{topicName(drill.topic)}</span>
      </div>

      {hasContext ? (
        <div className="mt-5">
          <Sentence drill={drill}>{middle}</Sentence>
        </div>
      ) : (
        (answer || kind !== "choose") && <p className="mt-5 text-xl leading-loose sm:text-2xl">{middle}</p>
      )}

      {!answer && kind === "choose" && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[first, second].map((o, i) => (
            <button
              key={o}
              type="button"
              autoFocus={i === 0}
              onClick={() => choose(o)}
              className="flex items-center gap-3 rounded-xl bg-snow px-4 py-3.5 text-left text-lg ring-1 ring-ice transition-colors hover:bg-ice"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface text-xs font-semibold text-granite ring-1 ring-ice">
                {i + 1}
              </span>
              {o}
            </button>
          ))}
        </div>
      )}

      {!answer && kind === "order" && (
        <>
          <div className="mt-6 flex min-h-12 flex-wrap gap-2" aria-label="Ord å velge">
            {tokens.map((t, i) =>
              picked.includes(i) ? null : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPicked((p) => [...p, i])}
                  className="rounded-md bg-snow px-3 py-1.5 text-lg ring-1 ring-ice transition-colors hover:bg-ice"
                >
                  {t}
                </button>
              ),
            )}
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              disabled={picked.length !== tokens.length}
              onClick={checkOrder}
              className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sjekk
            </button>
            {picked.length > 0 && (
              <button type="button" onClick={() => setPicked([])} className="text-sm font-medium text-granite hover:text-ink">
                Start på nytt
              </button>
            )}
          </div>
        </>
      )}

      {!answer && kind === "write" && (
        <form
          className="mt-6 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            checkTyped();
          }}
        >
          <label htmlFor="drill-answer" className="sr-only">
            Riktig form
          </label>
          <input
            id="drill-answer"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Skriv riktig form"
            className="min-w-0 flex-1 rounded-xl border-2 border-ice bg-surface px-4 py-2.5 text-lg focus:border-fjord focus:outline-none"
          />
          <button
            type="submit"
            disabled={!typed.trim()}
            className="rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sjekk
          </button>
        </form>
      )}

      {answer && (
        <div className="rise mt-6 border-t border-ice pt-5" aria-live="polite">
          <p className={`font-semibold ${answer.correct ? "text-moss" : "text-rorbu"}`}>{answer.correct ? "Riktig!" : "Ikke helt"}</p>
          {!answer.correct && (
            <p className="mt-1 text-sm text-granite">
              Du svarte <span className="text-rorbu line-through decoration-rorbu/50">{answer.given}</span>, riktig er{" "}
              <span className="font-semibold text-moss">{drill.correction}</span>.
            </p>
          )}
          <p {...textLang(drill.lang)} className="mt-2 leading-relaxed text-granite">
            {drill.explanation}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              autoFocus
              onClick={() => onNext(answer.correct)}
              className="rounded-md bg-ink px-6 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
            >
              Neste
            </button>
            {!answer.correct && kind === "write" && (
              <button
                type="button"
                onClick={() => setAnswer({ ...answer, correct: true })}
                className="text-sm font-medium text-granite underline-offset-4 hover:text-ink hover:underline"
              >
                Svaret mitt var også riktig
              </button>
            )}
            <Link
              href={
                drill.source === "muntlig"
                  ? `/trening/muntlig/oppgave/${drill.taskId}`
                  : `/trening/skriving/oppgave/${drill.taskId}?tekst=${drill.submissionId}`
              }
              className="text-sm font-medium text-fjord underline-offset-4 hover:underline"
            >
              {drill.source === "muntlig" ? "Se oppgaven feilen kom fra" : "Se teksten feilen kom fra"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** A round of exercises. A wrong answer comes back at the end of the round. */
function Practice({ drills, ids, onDone }: { drills: Drill[]; ids: string[]; onDone: () => void }) {
  const state = useAppState();
  // Kinds are fixed for the round, so a card does not change while its answer is shown.
  const [srsAtStart] = useState(state.srs);
  const [queue, setQueue] = useState(ids);
  const [missed, setMissed] = useState<Set<string>>(() => new Set());
  const [done, setDone] = useState(0);
  const [turn, setTurn] = useState(0);
  const drill = drills.find((d) => d.id === queue[0]);

  const next = (correct: boolean) => {
    if (!drill) return;
    const today = dayKey();
    reviewCard(drill.id, schedule(state.srs[drill.id], correct ? "good" : "again", today));
    if (!correct) setMissed((m) => new Set(m).add(drill.id));
    setQueue(([head, ...rest]) => (correct ? rest : [...rest, head]));
    if (correct) setDone((n) => n + 1);
    setTurn((t) => t + 1);
  };

  if (!drill) {
    const firstTry = ids.length - missed.size;
    return (
      <div className="rounded-2xl bg-surface p-8 text-center ring-1 ring-ice">
        <p className="font-display text-2xl font-medium tracking-tight">Bra jobbet!</p>
        <p className="mt-2 text-granite">
          {firstTry} av {ids.length} riktig på første forsøk. Øvelsene kommer tilbake når det er tid for å repetere dem.
        </p>
        <button type="button" onClick={onDone} className="mt-5 rounded-md bg-ink px-5 py-2.5 font-medium text-snow hover:bg-fjord">
          Tilbake til oversikten
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-4 text-sm text-granite">
        <span className="tabular-nums">
          {done} ferdig, {queue.length} igjen
        </span>
        <button type="button" onClick={onDone} className="font-medium hover:text-ink">
          Avslutt
        </button>
      </div>
      <div className="mt-3">
        <DrillCard key={turn} drill={drill} kind={drillKind(drill, srsAtStart[drill.id])} onNext={next} />
      </div>
    </div>
  );
}

export function ErrorsView() {
  const state = useAppState();
  const hydrated = useHydrated();
  const [round, setRound] = useState<string[] | null>(null);
  const drills = useMemo(() => collectDrills(state), [state]);
  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl bg-surface/60" aria-busy="true" />;

  const today = dayKey();
  const queue = reviewQueue(drills, state.srs, today);
  const learnt = (d: Drill) => (state.srs[d.id]?.interval ?? 0) >= LEARNT_INTERVAL;
  const texts = new Set(drills.map((d) => d.submissionId)).size;
  const topics = Object.entries(
    drills.reduce<Record<string, Drill[]>>((acc, d) => {
      (acc[d.topic] ??= []).push(d);
      return acc;
    }, {}),
  )
    .map(([topic, list]) => ({ topic, list, learnt: list.filter(learnt).length }))
    .sort((a, b) => b.list.length - b.learnt - (a.list.length - a.learnt));

  const topicRound = (list: Drill[]) =>
    [...list]
      .sort((a, b) => Number(learnt(a)) - Number(learnt(b)) || (state.srs[a.id]?.due ?? "").localeCompare(state.srs[b.id]?.due ?? ""))
      .slice(0, TOPIC_ROUND)
      .map((d) => d.id);

  return (
    <>
      <nav aria-label="Brødsmuler" className="text-sm text-granite">
        <Link href="/trening" className="underline-offset-4 hover:text-ink hover:underline">
          Trening
        </Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span>Øv på feilene dine</span>
      </nav>
      <h1 className="mt-5 font-display text-3xl font-medium tracking-tight sm:text-4xl">Øv på feilene dine</h1>
      <p className="mt-2 max-w-2xl text-granite">
        Feilene AI-sensoren fant i tekstene og de muntlige svarene dine, blir til små øvelser. De kommer tilbake over flere
        dager, til du ikke gjør dem lenger.
      </p>

      {round ? (
        <div className="mt-8">
          <Practice drills={drills} ids={round} onDone={() => setRound(null)} />
        </div>
      ) : drills.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-8">
          <p className="font-display text-2xl font-medium tracking-tight">Ingen feil å øve på ennå</p>
          <p className="mt-2 max-w-xl text-granite">
            Skriv en tekst eller svar på en muntlig oppgave, og få tilbakemelding fra AI-sensoren. Feilene du gjør, dukker opp
            her som øvelser.
          </p>
          <Link
            href="/trening/skriving"
            className="mt-5 inline-flex rounded-md bg-ink px-5 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
          >
            Skriv en tekst
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-fjord-deep p-6 text-snow sm:p-7">
            <div>
              <p className="font-display text-2xl font-medium tracking-tight">
                {queue.length ? `${queue.length} øvelser i dag` : "Ingen øvelser i dag"}
              </p>
              <p className="mt-1 text-mist">
                {drills.length} feil fra {texts} {texts === 1 ? "oppgave" : "oppgaver"}, {drills.filter(learnt).length} lært.
              </p>
            </div>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => setRound(queue.map((d) => d.id))}
                className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
              >
                Start øvelsene
              </button>
            )}
          </div>

          <h2 className="mt-10 text-xl font-semibold">Feil per tema</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {topics.map(({ topic, list, learnt: n }) => (
              <li key={topic} className="flex items-center gap-4 rounded-xl bg-surface px-4 py-3.5 ring-1 ring-ice">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{topicName(topic)}</span>
                    <span className="text-sm text-granite tabular-nums">
                      {n} av {list.length} lært
                    </span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ice" aria-hidden="true">
                    <span className="block h-full rounded-full bg-moss" style={{ width: `${(n / list.length) * 100}%` }} />
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setRound(topicRound(list))}
                  aria-label={`Øv på ${topicName(topic).toLowerCase()}`}
                  className="shrink-0 rounded-md px-3.5 py-2 text-sm font-medium ring-1 ring-ice transition-colors hover:bg-ice"
                >
                  Øv
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
