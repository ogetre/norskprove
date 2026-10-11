"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { PLANS, planCovers, type PlanId } from "@/lib/plans";
import { SKILL_NAMES, type Skill } from "@/lib/types";

/*
 * Subscription access. The plan comes from /api/me (subscriptions table).
 * In development the paywall can also be skipped for testing.
 */

type Me = { plan: PlanId | null; signedIn: boolean };

let mePromise: Promise<Me> | null = null;

function fetchMe(): Promise<Me> {
  mePromise ??= fetch("/api/me", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : { plan: null, signedIn: false }))
    .catch(() => ({ plan: null, signedIn: false }));
  return mePromise;
}

const DEV_KEY = "norskproveklar:dev-unlock";
const isDev = process.env.NODE_ENV === "development";
const devListeners = new Set<() => void>();

function devUnlocked(): boolean {
  try {
    return isDev && window.sessionStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

function unlockForDev() {
  try {
    window.sessionStorage.setItem(DEV_KEY, "1");
  } catch {
    // ignore
  }
  devListeners.forEach((l) => l());
}

export function useAccess(): { plan: PlanId | null; signedIn: boolean; loading: boolean; dev: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const dev = useSyncExternalStore(
    (cb) => {
      devListeners.add(cb);
      return () => devListeners.delete(cb);
    },
    devUnlocked,
    () => false,
  );

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((m) => {
      if (!cancelled) setMe(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan: me?.plan ?? null, signedIn: me?.signedIn ?? false, loading: me === null, dev };
}

export function planName(plan: PlanId | null): string {
  return PLANS.find((p) => p.id === plan)?.name ?? "";
}

export function Paywall({ children, skill, feature }: { children: ReactNode; skill: Skill; feature: string }) {
  const { plan, signedIn, loading, dev } = useAccess();

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;
  if (dev || planCovers(plan, skill)) return <>{children}</>;

  const needsUpgrade = plan !== null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-fjord-deep p-8 text-snow sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="aurora" />
      </div>
      <div className="relative max-w-lg">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <rect x="8" y="17" width="24" height="18" rx="4" fill="var(--rorbu)" />
          <path d="M13 17v-4a7 7 0 0114 0v4" fill="none" stroke="#dae6ea" strokeWidth="3" />
        </svg>
        <h2 className="mt-5 font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {needsUpgrade ? `${SKILL_NAMES[skill]} er med i Pluss og Premium` : `${feature} krever abonnement`}
        </h2>
        <p className="mt-3 leading-relaxed text-mist">
          {needsUpgrade
            ? `Abonnementet ditt (${planName(plan)}) gjelder lesing og lytting. Bytt til Pluss eller Premium for å øve på alle fire delene.`
            : "Velg et abonnement for å få tilgang til alle oppgavene, fulle delprøver og statistikken din. Du kan avslutte når du vil."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={signedIn ? "/priser" : "/logg-inn?redirect_url=/priser"}
            className="rounded-md bg-rorbu px-5 py-3 font-medium text-white transition-colors hover:bg-[#a03022]"
          >
            {needsUpgrade ? "Oppgrader abonnementet" : signedIn ? "Se abonnementer" : "Logg inn"}
          </Link>
          {isDev && (
            <button
              type="button"
              onClick={unlockForDev}
              className="rounded-md px-5 py-3 text-sm text-mist ring-1 ring-white/20 transition-colors hover:bg-white/10"
            >
              Utviklermodus: fortsett uten abonnement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small label with the user's plan, shown in the app header. */
export function PlanBadge() {
  const { plan, loading } = useAccess();
  if (loading || !plan) return null;
  return (
    <span className="hidden rounded-md bg-gradient-to-br from-[#f0b04a] to-[#d98a1c] px-2 py-0.5 text-xs font-semibold text-ink shadow-sm sm:inline">
      {planName(plan)}
    </span>
  );
}
