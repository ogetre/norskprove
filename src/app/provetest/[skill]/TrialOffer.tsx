"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { FREE_BETA } from "@/lib/plans";

const perks = [
  "Alle oppgavetyper i lesing, lytting, skriving og muntlig",
  "Fulle delprøver med tidtaker, som på prøven",
  "Graf som viser fremgangen din",
];

const primary = "rounded-md bg-rorbu px-5 py-3 font-medium text-white transition-colors hover:bg-[#a03022]";
const secondary = "rounded-md px-5 py-3 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice";

function Actions({ signedIn }: { signedIn: boolean }) {
  if (FREE_BETA) {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        {signedIn ? (
          <Link href="/trening" className={primary}>
            Gå til treningen
          </Link>
        ) : (
          <>
            <Link href="/registrer?redirect_url=/trening" className={primary}>
              Lag gratis konto
            </Link>
            <Link href="/trening" className={secondary}>
              Øv uten konto
            </Link>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {signedIn ? (
        <Link href="/priser" className="rounded-md bg-rorbu px-5 py-3 font-medium text-white transition-colors hover:bg-[#a03022]">
          Velg abonnement
        </Link>
      ) : (
        <>
          <Link
            href="/registrer?redirect_url=/priser"
            className="rounded-md bg-rorbu px-5 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
          >
            Logg inn og fortsett
          </Link>
          <Link href="/priser" className="rounded-md px-5 py-3 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice">
            Se abonnementer
          </Link>
        </>
      )}
    </div>
  );
}

/** Shown under the trial result: the next step needs an account and a subscription. */
export function TrialOffer({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="mt-4 rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-8" aria-labelledby="offer-title">
      <h2 id="offer-title" className="text-xl font-semibold">
        Vil du øve videre?
      </h2>
      <p className="mt-2 leading-relaxed text-granite">
        {FREE_BETA
          ? "Alt er gratis mens NorskprøveKlar er i beta. Med en gratis konto lagres fremgangen din, og du får tilbakemelding fra AI-sensoren."
          : "Logg inn og velg et abonnement for å trene på det du trenger mest fram til prøven."}
      </p>
      <ul className="mt-5 space-y-2">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 shrink-0">
              <circle cx="10" cy="10" r="10" fill="var(--ice)" />
              <path d="M5.8 10.2l2.8 2.8 5.6-6" fill="none" stroke="var(--fjord)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {p}
          </li>
        ))}
      </ul>
      {authEnabled ? (
        <>
          <Show when="signed-in">
            <Actions signedIn />
          </Show>
          <Show when="signed-out">
            <Actions signedIn={false} />
          </Show>
        </>
      ) : (
        <Actions signedIn={false} />
      )}
    </section>
  );
}
