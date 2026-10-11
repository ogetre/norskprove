"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const linkCls = "rounded-md px-3 py-2 whitespace-nowrap text-granite transition-colors hover:text-ink";
const primary =
  "ml-1 rounded-md bg-ink px-4 py-2 font-medium whitespace-nowrap text-snow transition-colors hover:bg-fjord";

export function Logo() {
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

/** "Logg inn" for visitors; a way into the training area for signed-in users. */
export function AuthActions({ authEnabled }: { authEnabled: boolean }) {
  if (!authEnabled) {
    return (
      <Link href="/logg-inn" className={primary}>
        Logg inn
      </Link>
    );
  }
  return (
    <>
      <Show when="signed-out">
        <Link href="/logg-inn" className={primary}>
          Logg inn
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/trening" className={primary}>
          Til treningen
        </Link>
        <span className="ml-3 flex items-center">
          <UserButton />
        </span>
      </Show>
    </>
  );
}

export function PublicHeader({ authEnabled }: { authEnabled: boolean }) {
  return (
    <header className="border-b border-ice bg-snow/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <nav aria-label="Hovednavigasjon" className="flex items-center text-sm">
          <Link href="/provetest" className={`hidden sm:block ${linkCls}`}>
            Gratis prøvetest
          </Link>
          <Link href="/priser" className={`hidden sm:block ${linkCls}`}>
            Priser
          </Link>
          <ThemeToggle className="mx-1" />
          <AuthActions authEnabled={authEnabled} />
        </nav>
      </div>
    </header>
  );
}
