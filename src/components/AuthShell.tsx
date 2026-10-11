import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

const perks = [
  "Fremgangen lagres på kontoen din",
  "Fortsett på mobil, nettbrett og PC",
  "Gratis å komme i gang",
];

function NightFjord() {
  return (
    <svg
      viewBox="0 0 800 420"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-[58%] w-full"
      aria-hidden="true"
    >
      <g fill="#ffffff">
        {[
          [80, 60, 1.2],
          [210, 30, 0.9],
          [330, 90, 1.4],
          [460, 40, 1],
          [590, 75, 1.1],
          [700, 25, 0.8],
          [150, 140, 0.8],
          [520, 150, 0.9],
          [740, 130, 1.2],
        ].map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            className="twinkle"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </g>
      <path
        fill="#24465c"
        d="M0 300 L70 240 L130 270 L220 170 L300 250 L380 210 L450 260 L540 150 L620 230 L700 190 L800 240 L800 420 L0 420Z"
      />
      <g fill="#dbe7eb" opacity="0.8">
        <path d="M220 170 L204 188 L214 185 L221 194 L230 184 L238 189Z" />
        <path d="M540 150 L522 170 L533 167 L541 177 L551 166 L560 171Z" />
      </g>
      <path
        fill="#173447"
        d="M0 330 L60 300 L140 330 L230 290 L310 340 L400 320 L480 345 L560 310 L650 340 L720 315 L800 330 L800 420 L0 420Z"
      />
      <rect x="0" y="365" width="800" height="55" fill="#0b2232" />
      <g stroke="#2f5870" strokeWidth="2" strokeLinecap="round">
        <line x1="120" y1="385" x2="190" y2="385" />
        <line x1="420" y1="400" x2="470" y2="400" />
      </g>
      {/* rorbu with a lit window, reflected in the water */}
      <g>
        <g stroke="#0b1620" strokeWidth="3">
          <line x1="592" y1="362" x2="592" y2="380" />
          <line x1="612" y1="362" x2="612" y2="380" />
          <line x1="632" y1="362" x2="632" y2="380" />
        </g>
        <rect x="582" y="334" width="62" height="28" fill="var(--rorbu)" />
        <path d="M575 336 L613 312 L651 336Z" fill="#0b1620" />
        <rect x="594" y="342" width="11" height="9" fill="#ffd27a" className="window-glow" />
        <rect x="622" y="344" width="11" height="18" fill="#7a2016" />
        <rect x="594" y="384" width="11" height="14" fill="#ffd27a" opacity="0.25" />
        <rect x="582" y="382" width="62" height="3" fill="var(--rorbu)" opacity="0.3" />
      </g>
    </svg>
  );
}

export function AuthUnavailable() {
  return (
    <div className="rounded-xl bg-surface p-7 shadow-[0_30px_60px_-34px_rgb(15_43_60/0.45)] ring-1 ring-ice">
      <h2 className="text-xl font-semibold">Innlogging er ikke klar ennå</h2>
      <p className="mt-3 leading-relaxed text-granite">
        Kontoer settes opp akkurat nå. Du kan fortsatt øve uten konto, og fremgangen
        lagres i nettleseren.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-ink px-4 py-2.5 font-medium text-snow transition-colors hover:bg-fjord"
      >
        Til forsiden
      </Link>
    </div>
  );
}

export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-fjord-deep text-snow lg:block">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora aurora-strong" />
        </div>
        <NightFjord />
        <div className="relative flex h-full flex-col px-12 pt-10 pb-12 xl:px-16">
          <Link href="/" className="flex items-center gap-2.5 self-start" aria-label="Til forsiden">
            <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
              <path d="M0 21 L9 6 L13 12 L19 2 L30 21Z" fill="#dae6ea" />
              <path d="M19 2 L16.5 6.3 L19 5.4 L21.5 6.3Z M9 6 L7 9.4 L9 8.9 L11 9.4Z" fill="#fff" />
              <rect x="20" y="15" width="7" height="6" fill="var(--rorbu)" />
            </svg>
            <span className="font-display text-[17px] font-medium tracking-tight">
              Norskprøve<span className="text-[#f0a093]">Klar</span>
            </span>
          </Link>

          <div className="mt-[12vh] max-w-md">
            <h1 className="rise font-display text-4xl leading-[1.1] font-medium tracking-tight xl:text-5xl">
              {title}
            </h1>
            <p className="rise mt-5 text-lg leading-relaxed text-ice/85" style={{ animationDelay: "120ms" }}>
              {lead}
            </p>
            <ul className="mt-8 space-y-3">
              {perks.map((p, i) => (
                <li
                  key={p}
                  className="rise flex items-center gap-3 text-ice"
                  style={{ animationDelay: `${240 + i * 110}ms` }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
                    <circle cx="10" cy="10" r="10" fill="rgb(255 255 255 / 0.12)" />
                    <path d="M5.8 10.2l2.8 2.8 5.6-6" fill="none" stroke="#7fe0b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-snow">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <Link href="/" className="font-display text-[17px] font-medium tracking-tight lg:hidden">
            Norskprøve<span className="text-rorbu">Klar</span>
          </Link>
          <span className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-granite underline-offset-4 hover:text-ink hover:underline">
              Til forsiden
            </Link>
          </span>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
          <div className="rise w-full max-w-[400px]" style={{ animationDelay: "150ms" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
