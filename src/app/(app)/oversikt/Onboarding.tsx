"use client";

import { useState } from "react";
import { browserLanguage, isLanguage, LANGUAGES, type LanguageCode } from "@/lib/languages";
import { saveProfile } from "@/lib/store";
import type { ExamGoal, Level, Profile } from "@/lib/types";

const goals: { value: ExamGoal; label: string }[] = [
  { value: "statsborgerskap", label: "Statsborgerskap" },
  { value: "permanent-opphold", label: "Permanent opphold" },
  { value: "jobb", label: "Jobb" },
  { value: "studier", label: "Studier" },
  { value: "annet", label: "Noe annet" },
];

const targets: Level[] = ["A2", "B1", "B2"];

export function Onboarding({
  profile,
  onDone,
  editing = false,
}: {
  profile: Profile;
  onDone?: () => void;
  editing?: boolean;
}) {
  const [goal, setGoal] = useState<ExamGoal | undefined>(profile.goal);
  const [examDate, setExamDate] = useState(profile.examDate ?? "");
  const [target, setTarget] = useState<Level>(profile.targetLevel ?? "B1");
  const [lang, setLang] = useState<LanguageCode>(() =>
    isLanguage(profile.nativeLanguage) ? profile.nativeLanguage : browserLanguage(),
  );

  const chip =
    "rounded-full border border-ice bg-surface px-4 py-2 text-sm transition-colors hover:border-mist aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-snow";

  return (
    <form
      className="rounded-2xl bg-surface p-6 ring-1 ring-ice sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        saveProfile({ goal, examDate: examDate || undefined, targetLevel: target, nativeLanguage: lang, onboarded: true });
        onDone?.();
      }}
    >
      <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
        {editing ? "Endre målet ditt" : "La oss lage planen din"}
      </h2>
      <p className="mt-2 text-granite">Svarene brukes til å vise hva du bør øve på, og hvor lang tid du har igjen.</p>

      <fieldset className="mt-6">
        <legend className="font-semibold">Hvorfor tar du Norskprøven?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {goals.map((g) => (
            <button key={g.value} type="button" aria-pressed={goal === g.value} onClick={() => setGoal(g.value)} className={chip}>
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className="font-semibold">Hvilket nivå trenger du?</legend>
          <div className="mt-3 flex gap-2">
            {targets.map((l) => (
              <button key={l} type="button" aria-pressed={target === l} onClick={() => setTarget(l)} className={chip}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="font-semibold">Når er prøven?</span>
          <input
            type="date"
            value={examDate}
            min={new Date().toLocaleDateString("sv-SE")}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-3 block w-full rounded-lg border border-ice bg-surface px-3 py-2 focus:border-fjord focus:outline-none"
          />
          <span className="mt-1 block text-sm text-granite">Du kan la feltet stå tomt hvis du ikke vet ennå.</span>
        </label>
      </div>

      <label className="mt-6 block max-w-sm">
        <span className="font-semibold">Hvilket språk vil du ha oversettelser på?</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LanguageCode)}
          className="mt-3 block w-full rounded-lg border border-ice bg-surface px-3 py-2 focus:border-fjord focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-granite">Brukes når du slår opp ord og oversetter tekster.</span>
      </label>

      <div className="mt-8 flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
        >
          {editing ? "Lagre" : "Lag planen min"}
        </button>
        {editing && (
          <button type="button" onClick={onDone} className="rounded-md px-5 py-3 font-medium text-granite hover:text-ink">
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
