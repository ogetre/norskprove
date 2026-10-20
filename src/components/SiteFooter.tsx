import Link from "next/link";

/** Links to the terms, the privacy policy and the contact page, which every page should reach. */
export const LEGAL_LINKS = [
  { href: "/personvern", label: "Personvern" },
  { href: "/vilkar", label: "Salgsvilkår" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-ice">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-granite sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© 2026 NorskprøveKlar · Uavhengig tjeneste, ikke tilknyttet HK-dir.</span>
        <nav aria-label="Om tjenesten" className="flex gap-5">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-4 hover:text-ink hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
