"use client";

import { useState } from "react";

const options = [
  {
    id: "a",
    text: "Vaske klær i blokk C",
    correct: true,
    feedback:
      "Riktig. Svaret står i setningen «Bruk vaskerommet i blokk C i mellomtiden». Mens vaskerommet er stengt, skal beboerne vaske klær i blokk C.",
  },
  {
    id: "b",
    text: "Pusse opp kjelleren",
    correct: false,
    feedback:
      "Feil. Det er ikke beboerne som pusser opp. Oppussingen er grunnen til at vaskerommet er stengt.",
  },
  {
    id: "c",
    text: "Ringe styret",
    correct: false,
    feedback:
      "Feil. Styret har skrevet beskjeden, men beboerne blir ikke bedt om å ringe noen.",
  },
];

const glossary = [
  ["beboere", "folk som bor i huset"],
  ["vaskerommet", "rommet der man vasker klær"],
  ["oppussing", "når man reparerer og gjør et rom nytt"],
  ["i mellomtiden", "mens noe annet skjer"],
  ["styret", "de som leder borettslaget"],
];

export function TaskDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const [showWords, setShowWords] = useState(false);
  const choice = options.find((o) => o.id === picked);

  return (
    <div className="relative rounded-xl bg-surface p-6 shadow-[0_1px_2px_rgb(15_43_60/0.06),0_30px_60px_-30px_rgb(15_43_60/0.45)] ring-1 ring-ice sm:p-8">
      <p className="text-sm text-granite">Prøv en leseoppgave på nivå A2</p>

      <div className="mt-5 rounded-r-md border-l-4 border-rorbu bg-snow px-5 py-4 text-[15px] leading-relaxed">
        <p className="font-semibold">Kjære beboere!</p>
        <p className="mt-2">
          Vaskerommet i kjelleren er stengt fra mandag 14. til fredag 18. oktober
          på grunn av oppussing. Bruk vaskerommet i blokk C i mellomtiden.
        </p>
        <p className="mt-2 text-granite">Hilsen styret</p>
      </div>

      <button
        type="button"
        onClick={() => setShowWords((v) => !v)}
        aria-expanded={showWords}
        className="mt-3 text-sm text-fjord underline decoration-ice underline-offset-4 hover:decoration-fjord"
      >
        {showWords ? "Skjul ordforklaringer" : "Vis ordforklaringer"}
      </button>
      {showWords && (
        <dl className="mt-2 space-y-1 text-sm">
          {glossary.map(([word, meaning]) => (
            <div key={word}>
              <dt className="inline font-medium">{word}</dt>
              <dd className="inline text-granite"> – {meaning}</dd>
            </div>
          ))}
        </dl>
      )}

      <fieldset className="mt-6">
        <legend className="font-semibold">Hva skal beboerne gjøre neste uke?</legend>
        <div className="mt-3 flex flex-col gap-2">
          {options.map((o) => {
            const isPicked = picked === o.id;
            const state = !picked
              ? "border-ice hover:border-fjord"
              : o.correct
                ? "border-moss bg-moss/10"
                : isPicked
                  ? "border-rorbu bg-rorbu/10"
                  : "border-ice opacity-60";
            return (
              <button
                key={o.id}
                type="button"
                disabled={!!picked}
                onClick={() => setPicked(o.id)}
                className={`rounded-md border-2 px-4 py-3 text-left transition-[color,background-color,border-color,transform] duration-200 enabled:active:scale-[0.99] ${state}`}
              >
                {o.text}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite">
        {choice && (
          <div className="mt-5">
            <p
              className={`text-sm leading-relaxed ${choice.correct ? "text-moss" : "text-rorbu"}`}
            >
              {choice.feedback}
            </p>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="mt-3 text-sm text-fjord underline decoration-ice underline-offset-4 hover:decoration-fjord"
            >
              Prøv igjen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
