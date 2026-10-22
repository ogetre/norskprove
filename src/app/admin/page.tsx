import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { MarkOwner } from "@/components/SiteAnalytics";
import { authEnabled } from "@/lib/auth-config";
import { adminAccess } from "@/lib/admin";
import { DAYS, loadStats, type Stats } from "@/lib/admin-stats";
import { isLanguage, languageInfo } from "@/lib/languages";
import { BETA_ORAL_CHECKS, BETA_WRITING_CHECKS } from "@/lib/plans";
import { SKILL_NAMES, type Skill } from "@/lib/types";
import { BarList, Card, Change, count, DailyColumns, dollars, Missing, StatTile } from "./charts";

export const metadata: Metadata = { title: "Statistikk", robots: { index: false, follow: false } };

const GOALS: Record<string, string> = {
  statsborgerskap: "Statsborgerskap",
  "permanent-opphold": "Permanent opphold",
  jobb: "Jobb",
  studier: "Studier",
  annet: "Noe annet",
};

const MODES: Record<string, string> = {
  quick: "Hurtigøving",
  full: "Full delprøve",
  trial: "Gratis prøvetest",
  text: "Skrevet tekst",
};

const AI_KINDS: Record<string, string> = {
  feedback: "Tilbakemelding på tekst",
  recheck: "Sjekk av egne rettelser",
  lookup: "Ordoppslag",
  translate: "Oversettelse av avsnitt",
  speaking: "Muntlig vurdering (Claude)",
  followup: "Oppfølgingsspørsmål (Claude)",
  speech: "Opplesning (Google, gratis)",
};

const LEVEL_ORDER = ["under A1", "A1", "A2", "B1", "B2"];

const LINKS = [
  { href: "https://vercel.com/davids-projects-55c869f6/norsk/analytics", label: "Besøkende", note: "Vercel Analytics" },
  { href: "https://dashboard.clerk.com", label: "Kontoer", note: "Clerk" },
  { href: "https://search.google.com/search-console", label: "Google-søk", note: "Search Console" },
];

export default function AdminPage() {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Statistikk</h1>
        <p className="mt-2 text-granite">
          Bare du ser denne siden. Tallene gjelder kontoer; elever uten konto ser du i Vercel Analytics. Besøkene dine
          fra en nettleser der du har åpnet denne siden, telles ikke der.
        </p>
        <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}

async function Dashboard() {
  const access = await adminAccess();
  if (access === "signed-out") redirect("/logg-inn?redirect_url=/admin");
  if (access === "denied") notFound();
  const s = await loadStats();
  return (
    <div className="mt-8 space-y-6">
      <MarkOwner />
      <Tiles s={s} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nye kontoer per dag" aside={s.accounts ? `${count(sumOf(s.accounts.daily))} siste ${DAYS} dager` : undefined}>
          {s.accounts ? <DailyColumns data={s.accounts.daily} /> : <Missing />}
        </Card>
        <Card title="Aktive elever per dag" aside="med konto">
          {s.learners ? <DailyColumns data={s.learners.daily} /> : <Missing />}
        </Card>
        <Card title="Oppgaver løst per dag" aside="alle, også uten konto">
          {s.everyone ? <DailyColumns data={s.everyone.daily} /> : <Missing />}
        </Card>
        <Card title="AI-kostnad per dag" aside="Gemini og Claude">
          {s.ai ? <DailyColumns data={s.ai.daily} format={dollars} /> : <Missing />}
        </Card>
      </div>
      <Practice s={s} />
      <Profiles s={s} />
      <Ai s={s} />
      <Reports s={s} />
      <div className="flex flex-wrap gap-3">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-surface px-4 py-3 ring-1 ring-ice transition-colors hover:bg-ice"
          >
            <span className="font-medium">{l.label}</span>
            <span className="ml-2 text-sm text-granite">{l.note} ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

const sumOf = (d: { value: number }[]) => d.reduce((t, x) => t + x.value, 0);

function Tiles({ s }: { s: Stats }) {
  const a = s.accounts;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Kontoer"
        value={a ? count(a.total) : "–"}
        detail={a && <Change now={a.new7} before={a.newPrev7} />}
      />
      <StatTile
        label="Aktive siste 7 dager"
        value={a ? count(a.active7) : s.learners ? count(s.learners.active7) : "–"}
        detail={a && `${count(a.active30)} siste 30 dager`}
      />
      <StatTile
        label="Oppgaver løst siste 7 dager"
        value={s.everyone ? count(s.everyone.last7) : "–"}
        detail={s.everyone && `${count(s.everyone.withoutAccount7)} av dem uten konto`}
      />
      <StatTile
        label="AI denne måneden"
        value={s.ai ? dollars(s.ai.claudeUsd + s.ai.geminiUsd) : "–"}
        detail={s.ai && `Gemini ${dollars(s.ai.geminiUsd)} · Claude ${dollars(s.ai.claudeUsd)}`}
      />
    </div>
  );
}

function Practice({ s }: { s: Stats }) {
  const p = s.practice;
  const levels = p ? LEVEL_ORDER.map((key) => ({ key, value: p.fullResults.find((r) => r.key === key)?.value ?? 0 })) : [];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Øving per del" aside={`siste ${DAYS} dager`}>
        {p ? <BarList items={p.bySkill} label={(k) => SKILL_NAMES[k as Skill] ?? k} /> : <Missing />}
      </Card>
      <Card title="Slik øver de" aside={`siste ${DAYS} dager`}>
        {p ? (
          <>
            <BarList items={p.byMode} label={(k) => MODES[k] ?? k} />
            <p className="mt-4 text-sm text-granite">
              {count(p.texts)} tekster skrevet, {count(p.spoken)} muntlige oppgaver, {count(p.words)} ord lagret.
            </p>
          </>
        ) : (
          <Missing />
        )}
      </Card>
      <Card title="Nivå på fulle delprøver" aside={`siste ${DAYS} dager`}>
        {p ? <BarList items={levels.some((l) => l.value) ? levels : []} /> : <Missing />}
      </Card>
    </div>
  );
}

function Profiles({ s }: { s: Stats }) {
  const p = s.profiles;
  const month = (key: string) => {
    const d = new Date(`${key}-15T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString("nb-NO", { month: "long", year: "numeric", timeZone: "UTC" });
  };
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card title="Hvorfor de tar prøven">{p ? <BarList items={p.goals} label={(k) => GOALS[k] ?? k} /> : <Missing />}</Card>
      <Card title="Målnivå">
        {p ? <BarList items={[...p.targets].sort((a, b) => a.key.localeCompare(b.key))} /> : <Missing />}
      </Card>
      <Card title="Morsmål">
        {p ? <BarList items={p.languages} label={(k) => (isLanguage(k) ? languageInfo(k).english : k)} /> : <Missing />}
      </Card>
      <Card title="Når de skal ta prøven">{p ? <BarList items={p.examMonths} label={month} /> : <Missing />}</Card>
    </div>
  );
}

function Ai({ s }: { s: Stats }) {
  const ai = s.ai;
  if (!ai) {
    return (
      <Card title="AI denne måneden">
        <Missing />
      </Card>
    );
  }
  return (
    <Card title="AI denne måneden" aside={`Gemini totalt hittil: ${dollars(ai.geminiAllTime)}`}>
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="text-granite">
          <tr>
            <th className="pb-2 font-normal">Hva</th>
            <th className="pb-2 text-right font-normal">Antall</th>
            <th className="pb-2 text-right font-normal">Kostnad</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[var(--grid)]">
            <td className="py-2">Muntlige vurderinger (Gemini)</td>
            <td className="py-2 text-right">{count(ai.oralChecks)}</td>
            <td className="py-2 text-right">{dollars(ai.geminiUsd)}</td>
          </tr>
          {ai.byKind.map((k) => (
            <tr key={k.kind} className="border-t border-[var(--grid)]">
              <td className="py-2">{AI_KINDS[k.kind] ?? k.kind}</td>
              <td className="py-2 text-right">{count(k.requests)}</td>
              <td className="py-2 text-right">{dollars(k.usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-granite">
        Har brukt opp månedens gratis vurderinger: {count(ai.writingUsedUp)} på skriving (av {BETA_WRITING_CHECKS}),{" "}
        {count(ai.oralUsedUp)} på muntlig (av {BETA_ORAL_CHECKS}).
      </p>
    </Card>
  );
}

function Reports({ s }: { s: Stats }) {
  const r = s.reports;
  return (
    <Card title="Meldte feil" aside={r && r.length > 0 ? `de ${r.length} nyeste` : undefined}>
      {!r ? (
        <Missing />
      ) : r.length === 0 ? (
        <p className="text-sm text-granite">Ingen har meldt feil ennå.</p>
      ) : (
        <ul className="divide-y divide-[var(--grid)]">
          {r.map((x, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-granite">
                <span className="tabular-nums">{x.at}</span>
                <a href={x.path} className="font-medium text-fjord underline-offset-4 hover:underline">
                  {x.path}
                </a>
                <span>{x.account ? "med konto" : "uten konto"}</span>
              </div>
              <p className="mt-1 whitespace-pre-line">{x.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
