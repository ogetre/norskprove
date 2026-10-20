import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled } from "@/lib/auth-config";
import { BETA_ORAL_CHECKS, BETA_WRITING_CHECKS, FREE_BETA, PLANS } from "@/lib/plans";
import { BetaActions } from "./BetaActions";
import { PlanButton } from "./PlanButton";

export const metadata: Metadata = { title: "Priser" };

const check = (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 shrink-0">
    <circle cx="10" cy="10" r="10" fill="var(--ice)" />
    <path d="M5.8 10.2l2.8 2.8 5.6-6" fill="none" stroke="var(--fjord)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BETA_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Uten konto",
    items: [
      "Alle oppgavene i lesing, lytting, skriving og muntlig",
      "Fulle delprøver med tidtaker, bygget opp som på prøven",
      "Forklaring på det du svarer feil på",
    ],
  },
  {
    title: "Med gratis konto",
    items: [
      "Fremgangen lagres på alle enhetene dine",
      `AI-tilbakemelding på tekstene du skriver: ${BETA_WRITING_CHECKS} tekster i måneden`,
      `AI-vurdering av muntlig, også uttalen: ${BETA_ORAL_CHECKS} prøver i måneden`,
      "Oversettelse til morsmålet ditt når du trykker på et ord",
    ],
  },
];

/** While the site is a free beta: what is free, and what an account adds. */
function FreeBeta() {
  return (
    <>
      <div className="mx-auto max-w-2xl text-center">
        <p className="rise inline-flex rounded-full bg-tint px-3 py-1 text-sm font-medium text-fjord">Beta</p>
        <h1 className="rise mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">Gratis mens vi tester</h1>
        <p className="rise mt-4 text-lg leading-relaxed text-granite" style={{ animationDelay: "100ms" }}>
          NorskprøveKlar er ny, og alt er gratis mens vi ser hvordan tjenesten blir brukt. Du trenger ikke kort.
        </p>
      </div>
      <ul className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        {BETA_GROUPS.map((g, i) => (
          <li key={g.title} className="rise rounded-2xl bg-surface p-7 ring-1 ring-ice" style={{ animationDelay: `${150 + i * 100}ms` }}>
            <h2 className="text-xl font-semibold">{g.title}</h2>
            <ul className="mt-5 space-y-3">
              {g.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-snug">
                  {check}
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <BetaActions authEnabled={authEnabled} />
      </div>
      <p className="mx-auto mt-10 max-w-xl text-center text-sm leading-relaxed text-granite">
        Når betaling åpner, gir vi beskjed i god tid, og det du har lagret, beholder du. Har du tilbakemeldinger?{" "}
        <Link href="/kontakt" className="font-medium text-fjord underline-offset-4 hover:underline">
          Skriv til oss
        </Link>
        .
      </p>
    </>
  );
}

export default function PricingPage() {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-24 sm:px-8">
        {FREE_BETA ? <FreeBeta /> : <Plans />}
      </main>
      <SiteFooter />
    </>
  );
}

/** The plans and their prices, once payment opens. */
function Plans() {
  return (
    <>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="rise font-display text-4xl font-medium tracking-tight sm:text-5xl">Velg abonnement</h1>
          <p className="rise mt-4 text-lg leading-relaxed text-granite" style={{ animationDelay: "100ms" }}>
            Månedlig abonnement uten bindingstid. Avslutt når du har bestått.
          </p>
        </div>

        <ul className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <li
              key={p.id}
              className={`rise relative flex flex-col rounded-2xl p-7 ${
                p.recommended
                  ? "bg-fjord-deep text-snow shadow-[0_40px_80px_-40px_rgb(15_43_60/0.7)] lg:-my-4 lg:py-11"
                  : "bg-surface ring-1 ring-ice"
              }`}
              style={{ animationDelay: `${150 + i * 100}ms` }}
            >
              {p.recommended && (
                <span className="absolute -top-3 left-7 rounded-md bg-rorbu px-2.5 py-1 text-xs font-semibold text-white lg:top-4">
                  Mest valgt
                </span>
              )}
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className={`mt-1 text-sm ${p.recommended ? "text-mist" : "text-granite"}`}>{p.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-medium tracking-tight tabular-nums">{p.price}</span>
                <span className={p.recommended ? "text-mist" : "text-granite"}>kr / mnd</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] leading-snug">
                    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 shrink-0">
                      <circle cx="10" cy="10" r="10" fill={p.recommended ? "rgb(255 255 255 / 0.12)" : "var(--ice)"} />
                      <path
                        d="M5.8 10.2l2.8 2.8 5.6-6"
                        fill="none"
                        stroke={p.recommended ? "#7fe0b8" : "var(--fjord)"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <PlanButton plan={p.id} name={p.name} highlighted={Boolean(p.recommended)} authEnabled={authEnabled} />
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-12 max-w-xl text-center text-sm leading-relaxed text-granite">
          Prisene er i norske kroner og inkluderer mva. Betaling skjer trygt med kort. Abonnementet fornyes hver måned
          til du sier det opp, og du har 14 dagers angrerett. Les{" "}
          <Link href="/vilkar" className="font-medium text-fjord underline-offset-4 hover:underline">
            salgsvilkårene
          </Link>
          .
        </p>
    </>
  );
}
