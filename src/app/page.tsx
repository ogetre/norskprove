import type { CSSProperties } from "react";
import Link from "next/link";
import { Landscape } from "@/components/Landscape";
import { LevelRidge } from "@/components/LevelRidge";
import { ProgressPreview } from "@/components/ProgressPreview";
import { AuthActions } from "@/components/PublicHeader";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TaskDemo } from "@/components/TaskDemo";
import { authEnabled } from "@/lib/auth-config";

const iconProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 28 28",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const parts = [
  {
    official: "Leseforståelse",
    title: "Lesing",
    text: "Oppslag, brev og artikler. Vanskelighetsgraden tilpasser seg svarene dine, akkurat som på prøven.",
    icon: (
      <svg {...iconProps}>
        <path pathLength={1} d="M4 6.5c3-1.2 6.5-1 10 1.2 3.5-2.2 7-2.4 10-1.2v15c-3-1.2-6.5-1-10 1.2-3.5-2.2-7-2.4-10-1.2z" />
        <path pathLength={1} d="M14 7.7v15" />
      </svg>
    ),
  },
  {
    official: "Lytteforståelse",
    title: "Lytting",
    text: "Samtaler på ulike dialekter fra Oslo, Bergen, Trondheim og Nord-Norge. Du hører opptakene like mange ganger som på prøven.",
    icon: (
      <svg {...iconProps}>
        <path pathLength={1} d="M4 14h2.5M9 9v10M13.5 5v18M18 9.5v9M22.5 12v4M25 14h-1" />
      </svg>
    ),
  },
  {
    official: "Skriftlig framstilling",
    title: "Skriving",
    text: "Skriv e-poster, fortellinger og meningstekster uten stavekontroll. Du ser hvilke krav du oppfyller og får en eksempeltekst.",
    icon: (
      <svg {...iconProps}>
        <path pathLength={1} d="M5 23l1.2-4.6L18.5 6.1a2.3 2.3 0 013.3 3.3L9.6 21.8z" />
        <path pathLength={1} d="M16.5 8.2l3.3 3.3M5 23h18" />
      </svg>
    ),
  },
  {
    official: "Muntlig prøve",
    title: "Muntlig",
    text: "Sensoren stiller spørsmål med stemme, og du svarer i mikrofonen. Etterpå hører du opptaket ditt og et eksempelsvar.",
    icon: (
      <svg {...iconProps}>
        <path pathLength={1} d="M5 6.5h18v11H12l-5 4.5v-4.5H5z" />
        <path pathLength={1} d="M10 12h.01M14 12h.01M18 12h.01" strokeWidth={2.4} />
      </svg>
    ),
  },
];

const steps = [
  {
    title: "Nivåtest",
    text: "15 minutter. Finn ut hvor du står i hver del av prøven.",
  },
  {
    title: "Plan fram til prøven",
    text: "Legg inn prøvedatoen, så får du oppgaver for hver dag.",
  },
  {
    title: "Prøveeksamen",
    text: "Hele prøven med tidtaker. Se om du er klar til å gå opp.",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="NorskprøveKlar, til forsiden">
      <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
        <path d="M0 21 L9 6 L13 12 L19 2 L30 21Z" fill="var(--fjord)" />
        <path d="M19 2 L16.5 6.3 L19 5.4 L21.5 6.3Z M9 6 L7 9.4 L9 8.9 L11 9.4Z" fill="#fff" />
        <rect x="20" y="15" width="7" height="6" fill="var(--rorbu)" />
      </svg>
      <span className="font-display text-[17px] font-medium tracking-tight">
        Norskprøve<span className="text-rorbu">Klar</span>
      </span>
    </Link>
  );
}

const ctaPrimary =
  "inline-flex items-center justify-center rounded-md bg-rorbu px-6 py-3.5 font-medium text-white shadow-[0_10px_24px_-12px_rgb(184_58_43/0.7)] transition-[background-color,transform] duration-200 hover:bg-[#a03022] active:translate-y-px";

const sectionTitle =
  "font-display text-[1.7rem] leading-tight font-medium tracking-tight sm:text-4xl";

const navLink =
  "hidden rounded-md px-3 py-2 text-granite transition-colors hover:text-ink lg:block";

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-snow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Hopp til innholdet
      </a>

      <SiteHeader>
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between px-4 sm:px-8">
          <Logo />
          <nav aria-label="Hovednavigasjon" className="flex items-center gap-1 text-sm">
            <a href="#parts" className={navLink}>
              Delprøver
            </a>
            <a href="#how" className={navLink}>
              Slik fungerer det
            </a>
            <a href="#fremgang" className={navLink}>
              Fremgang
            </a>
            <a href="#levels" className={navLink}>
              Nivåer
            </a>
            <Link href="/priser" className={navLink}>
              Priser
            </Link>
            <ThemeToggle className="mx-1" />
            <AuthActions authEnabled={authEnabled} />
          </nav>
        </div>
      </SiteHeader>

      <main id="main" className="flex-1">
        <section className="relative -mt-[68px] overflow-hidden bg-[radial-gradient(120%_70%_at_80%_0%,var(--hero-glow)_0%,var(--snow)_60%)] pt-[68px] pb-[clamp(80px,13vw,190px)]">
          <Landscape className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(220px,30vw,430px)] w-full" />

          <div className="relative mx-auto grid max-w-6xl items-start gap-12 px-4 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-14">
            <div className="lg:pt-6">
              <h1 className="rise font-display text-[2.2rem] leading-[1.08] font-medium tracking-[-0.02em] sm:text-5xl lg:text-[3.3rem]">
                Bestå norskprøven på første&nbsp;forsøk
              </h1>
              <p
                className="rise mt-6 max-w-[34rem] text-lg leading-relaxed text-granite"
                style={{ animationDelay: "120ms" }}
              >
                Øv til alle fire delene av prøven. Oppgavene har samme format som på
                den ekte prøven, og du får forklart det du svarer feil på.
              </p>
              <div
                className="rise mt-9 flex flex-col gap-4 sm:flex-row sm:items-center"
                style={{ animationDelay: "240ms" }}
              >
                <Link href="/provetest" className={ctaPrimary}>
                  Ta en gratis prøvetest
                </Link>
                <a
                  href="#demo"
                  className="text-center font-medium text-fjord underline decoration-mist underline-offset-[6px] transition-colors hover:decoration-fjord sm:text-left"
                >
                  Prøv en oppgave her
                </a>
              </div>
            </div>

            <div id="demo" className="rise scroll-mt-24" style={{ animationDelay: "200ms" }}>
              <TaskDemo />
            </div>
          </div>
        </section>

        <section id="parts" className="scroll-mt-16 bg-fjord-deep text-snow">
          <Reveal className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
              <h2 className={`r-up ${sectionTitle}`}>Fire delprøver, fire treningsrom</h2>
              <p className="r-up max-w-lg leading-relaxed text-mist lg:justify-self-end" style={v({ "--i": 1 })}>
                Norskprøven tester lesing, lytting, skriving og muntlig hver for seg.
                Du øver på hver del i akkurat det formatet den har på prøven.
              </p>
            </div>
            <ul className="mt-14 grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2">
              {parts.map((p, i) => (
                <li key={p.official} className="bg-fjord-deep transition-colors hover:bg-[#13344a]">
                  <div className="r-up p-7 sm:p-9" style={v({ "--i": i + 2 })}>
                    <div className="r-icon text-mist" style={v({ "--d": `${300 + i * 150}ms` })}>
                      {p.icon}
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-[#e7a59b]">{p.official}</p>
                    <p className="mt-4 max-w-md leading-relaxed text-ice/80">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section id="how" className="scroll-mt-16">
          <Reveal className="mx-auto max-w-6xl px-4 pt-24 pb-28 sm:px-8">
            <h2 className={`r-up ${sectionTitle}`}>Slik forbereder du deg</h2>
            <ol className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
              <span
                aria-hidden="true"
                className="r-trail absolute top-[22px] right-[8%] left-[8%] hidden border-t-2 border-dashed border-mist md:block"
                style={v({ "--d": "250ms" })}
              />
              {steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <span
                    className="r-pop relative grid size-11 place-items-center rounded-full bg-snow font-display text-lg font-medium text-rorbu ring-2 ring-rorbu"
                    style={v({ "--d": `${300 + i * 380}ms` })}
                  >
                    {i + 1}
                  </span>
                  <div className="r-up" style={v({ "--d": `${420 + i * 380}ms` })}>
                    <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-2 max-w-xs leading-relaxed text-granite">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        <section className="bg-tint">
          <Reveal className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-24 pb-28 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
            <div className="r-up">
              <h2 className={sectionTitle}>Lær av feilene dine</h2>
              <p className="mt-5 max-w-md leading-relaxed text-granite">
                Hvert svar har en forklaring på regelen bak, så du forstår hvorfor noe er
                riktig. Snart får du også tilbakemelding på grammatikken i dine egne tekster.
              </p>
            </div>
            <figure
              className="r-up rounded-xl bg-surface p-6 shadow-[0_30px_60px_-34px_rgb(15_43_60/0.45)] ring-1 ring-ice sm:p-9"
              style={v({ "--i": 1 })}
            >
              <div className="flex items-center justify-between text-sm text-granite">
                <span>Teksten din</span>
                <span
                  className="r-pop rounded-md bg-rorbu/10 px-2 py-0.5 font-medium text-rorbu"
                  style={v({ "--d": "900ms" })}
                >
                  1 feil
                </span>
              </div>
              <p className="mt-4 text-xl">
                I går{" "}
                <span
                  className="r-mark rounded-sm bg-rorbu/10 underline decoration-rorbu decoration-wavy underline-offset-[5px]"
                  style={v({ "--d": "750ms" })}
                >
                  jeg gikk
                </span>{" "}
                til butikken.
              </p>
              <p className="r-up mt-3 text-xl text-moss" style={v({ "--d": "1150ms" })}>
                I går <strong className="font-semibold">gikk jeg</strong> til butikken.
              </p>
              <figcaption
                className="r-up mt-6 border-t border-ice pt-5 leading-relaxed text-granite"
                style={v({ "--d": "1400ms" })}
              >
                <span className="font-semibold text-ink">V2-regelen.</span> Verbet står
                alltid på andreplass. Når setningen begynner med «I går», kommer
                subjektet etter verbet.
              </figcaption>
            </figure>
          </Reveal>
        </section>

        <section id="fremgang" className="scroll-mt-16 bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-24 pb-28 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <h2 className={`r-up ${sectionTitle}`}>Se fremgangen din uke for uke</h2>
              <p className="r-up mt-5 max-w-md leading-relaxed text-granite" style={v({ "--i": 1 })}>
                Profilen viser nivået ditt i hver del av prøven, hvor mange dager på
                rad du har øvd og hvordan resultatene på prøveeksamen utvikler seg. Da
                vet du hva du skal øve på i dag.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Nivå i lesing, lytting, skriving og muntlig",
                  "Graf over resultatene på prøveeksamen",
                  "Dager på rad og daglige mål",
                  "Ord og grammatikk du bør repetere",
                ].map((item, i) => (
                  <li key={item} className="r-up flex items-start gap-3" style={v({ "--i": i + 2 })}>
                    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="mt-0.5 shrink-0">
                      <circle cx="11" cy="11" r="11" fill="var(--ice)" />
                      <path d="M6.5 11.2l3 3 6-6.4" fill="none" stroke="var(--fjord)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <div className="min-w-0">
              <p className="mb-3 text-sm text-granite">Eksempel på en profil</p>
              <ProgressPreview />
            </div>
          </div>
        </section>

        <section id="levels" className="scroll-mt-16">
          <Reveal className="mx-auto max-w-6xl px-4 pt-24 pb-28 sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <h2 className={`r-up ${sectionTitle}`}>Hvert nivå er en ny topp</h2>
              <p className="r-up max-w-md leading-relaxed text-granite lg:justify-self-end" style={v({ "--i": 1 })}>
                Velg målet ditt, så viser vi veien fra nivået du har i dag.
              </p>
            </div>

            <LevelRidge />
          </Reveal>
        </section>
      </main>

      <footer className="relative mt-8 bg-fjord-deep text-snow">
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute -top-[79px] left-0 h-20 w-full"
          aria-hidden="true"
        >
          <path
            fill="var(--fjord-deep)"
            d="M0 80 L0 52 L90 30 L170 50 L280 12 L380 46 L470 34 L560 60 L680 20 L790 52 L900 36 L1010 58 L1120 18 L1230 48 L1330 30 L1440 50 L1440 80Z"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora" />
        </div>
        <Reveal className="relative mx-auto max-w-6xl px-4 pt-20 pb-10 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="r-up">
              <p className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
                Lykke til på prøven!
              </p>
              <p className="mt-3 text-mist">Start forberedelsene i dag.</p>
            </div>
            <div className="r-up self-start md:self-auto" style={v({ "--i": 1 })}>
              <Link href="/provetest" className={ctaPrimary}>
                Ta en gratis prøvetest
              </Link>
            </div>
          </div>
          <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-mist sm:flex-row sm:justify-between">
            <span>© 2026 NorskprøveKlar</span>
            <span>Uavhengig tjeneste, ikke tilknyttet HK-dir.</span>
          </div>
        </Reveal>
      </footer>
    </>
  );
}
