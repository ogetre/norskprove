import Link from "next/link";
import type { ReactNode } from "react";
import { authEnabled } from "@/lib/auth-config";
import { Landscape } from "./Landscape";
import { PublicHeader } from "./PublicHeader";
import { SiteFooter } from "./SiteFooter";

/** A page that says something went wrong, for the 404 page and the error page. */
export function StatusPage({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative mx-auto w-full max-w-3xl px-4 pt-16 pb-[clamp(180px,26vw,320px)] sm:px-8">
          <p className="font-display text-sm font-medium tracking-widest text-rorbu">{code}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
          <div className="mt-5 max-w-xl text-lg leading-relaxed text-granite">{children}</div>
        </div>
        <Landscape className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(160px,24vw,300px)] w-full" />
      </main>
      <SiteFooter />
    </>
  );
}

export const statusPrimary =
  "inline-flex items-center justify-center rounded-md bg-rorbu px-5 py-3 font-medium text-white transition-colors hover:bg-[#a03022]";
export const statusSecondary =
  "inline-flex items-center justify-center rounded-md px-5 py-3 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice";

export function StatusLinks({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-wrap gap-3 text-base">{children}</div>;
}

export function HomeLink() {
  return (
    <Link href="/" className={statusSecondary}>
      Til forsiden
    </Link>
  );
}
