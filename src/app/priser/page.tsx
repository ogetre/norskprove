import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled } from "@/lib/auth-config";
import { PLANS } from "@/lib/plans";
import { PlanButton } from "./PlanButton";

export const metadata: Metadata = { title: "Priser" };

export default function PricingPage() {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-24 sm:px-8">
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
      </main>
      <SiteFooter />
    </>
  );
}
