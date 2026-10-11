"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { PlanBadge } from "./Access";
import { ThemeToggle } from "./ThemeToggle";
import { useSyncStatus, type SyncStatus } from "./ProgressSync";

const nav = [
  { href: "/trening", label: "Trening", exact: true },
  { href: "/trening/lesing", label: "Lesing" },
  { href: "/trening/lytting", label: "Lytting" },
  { href: "/trening/skriving", label: "Skriving" },
  { href: "/trening/muntlig", label: "Muntlig" },
  { href: "/oversikt", label: "Min fremgang" },
];

const statusText: Record<SyncStatus, string> = {
  guest: "",
  loading: "Henter fremgang …",
  saving: "Lagrer …",
  saved: "Lagret",
  error: "Kunne ikke lagre",
};

function SyncBadge() {
  const status = useSyncStatus();
  if (status === "guest") return null;
  return (
    <span
      role="status"
      className={`hidden items-center gap-1.5 text-xs sm:flex ${status === "error" ? "text-rorbu" : "text-granite"}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          status === "saved" ? "bg-moss" : status === "error" ? "bg-rorbu" : "animate-pulse bg-mist"
        }`}
      />
      {statusText[status]}
    </span>
  );
}

function UserArea() {
  return (
    <div className="flex items-center gap-4">
      <SyncBadge />
      <Show when="signed-in">
        <PlanBadge />
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton>
          <button className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-snow transition-colors hover:bg-fjord">
            Logg inn
          </button>
        </SignInButton>
      </Show>
    </div>
  );
}

const linkCls =
  "shrink-0 rounded-md px-3 py-2 text-granite transition-colors hover:text-ink aria-[current=page]:bg-ice aria-[current=page]:font-medium aria-[current=page]:text-ink";

function NavLinks() {
  const pathname = usePathname();
  return nav.map((item) => (
    <Link
      key={item.label}
      href={item.href}
      aria-current={(item.exact ? pathname === item.href : pathname.startsWith(item.href)) ? "page" : undefined}
      className={linkCls}
    >
      {item.label}
    </Link>
  ));
}

export function AppHeader({ authEnabled }: { authEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ice bg-snow/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="NorskprøveKlar, til forsiden">
          <svg width="28" height="20" viewBox="0 0 30 22" aria-hidden="true">
            <path d="M0 21 L9 6 L13 12 L19 2 L30 21Z" fill="var(--fjord)" />
            <path d="M19 2 L16.5 6.3 L19 5.4 L21.5 6.3Z M9 6 L7 9.4 L9 8.9 L11 9.4Z" fill="#fff" />
            <rect x="20" y="15" width="7" height="6" fill="var(--rorbu)" />
          </svg>
          <span className="hidden font-display text-[16px] font-medium tracking-tight md:inline">
            Norskprøve<span className="text-rorbu">Klar</span>
          </span>
        </Link>

        <nav aria-label="Hovedmeny" className="-mx-2 flex min-w-0 flex-1 gap-1 overflow-x-auto px-2 text-sm [scrollbar-width:none]">
          {/* The active link depends on the URL, so it streams in after the static shell. */}
          <Suspense
            fallback={nav.map((item) => (
              <Link key={item.label} href={item.href} className={linkCls}>
                {item.label}
              </Link>
            ))}
          >
            <NavLinks />
          </Suspense>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {authEnabled ? <UserArea /> : <span className="text-xs text-granite">Gjestemodus</span>}
        </div>
      </div>
    </header>
  );
}
