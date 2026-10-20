import Link from "next/link";
import type { ReactNode } from "react";
import { COMPANY, LEGAL_UPDATED } from "@/lib/company";
import { authEnabled } from "@/lib/auth-config";
import { PublicHeader } from "./PublicHeader";
import { SiteFooter } from "./SiteFooter";

/** A page of terms or policy: the title, when it changed, and sections of text. */
export function LegalPage({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-12 pb-20 sm:px-8">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-granite">Sist oppdatert {LEGAL_UPDATED}</p>
        <div className="mt-6 text-lg leading-relaxed text-granite">{lead}</div>
        <div className="mt-10 space-y-10 leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-mist">{children}</ul>;
}

/** One of the company's details, or a clear marker while it isn't filled in. */
export function CompanyField({ field }: { field: keyof typeof COMPANY }) {
  const value = COMPANY[field];
  if (value && field === "email") {
    return (
      <a href={`mailto:${value}`} className={legalLink}>
        {value}
      </a>
    );
  }
  if (value) return <>{value}</>;
  const label = { name: "firmanavn", orgNr: "organisasjonsnummer", address: "adresse", email: "e-postadresse" }[field];
  return <span className="rounded bg-note px-1.5 py-0.5 text-sm text-note-ink">{label} fylles inn</span>;
}

/** The company's details as a block, for the contact page and the terms. */
export function CompanyDetails() {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-xl bg-surface p-5 ring-1 ring-ice sm:grid-cols-[10rem_1fr]">
      <dt className="text-granite">Tjenesten drives av</dt>
      <dd className="font-medium">
        <CompanyField field="name" />
      </dd>
      <dt className="text-granite">Organisasjonsnummer</dt>
      <dd>
        <CompanyField field="orgNr" />
      </dd>
      <dt className="text-granite">Adresse</dt>
      <dd>
        <CompanyField field="address" />
      </dd>
      <dt className="text-granite">E-post</dt>
      <dd>
        <CompanyField field="email" />
      </dd>
    </dl>
  );
}

export const legalLink = "font-medium text-fjord underline-offset-4 hover:underline";

export function To({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("http") ? (
    <a href={href} className={legalLink} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={legalLink}>
      {children}
    </Link>
  );
}
