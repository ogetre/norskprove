"use client";

import Link from "next/link";
import "./globals.css";

/** Shown only when the root layout itself fails, so it brings its own document and keeps to plain markup. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="nb">
      <body className="flex min-h-screen items-center justify-center bg-snow p-6 font-sans text-ink">
        <title>Noe gikk galt – NorskprøveKlar</title>
        <main className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">Noe gikk galt</h1>
          <p className="mt-4 text-lg leading-relaxed text-granite">
            NorskprøveKlar kunne ikke vises akkurat nå. Prøv igjen om litt.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-md bg-rorbu px-5 py-3 font-medium text-white hover:bg-[#a03022]"
            >
              Prøv igjen
            </button>
            <Link href="/" className="rounded-md px-5 py-3 font-medium ring-1 ring-ice hover:bg-ice">
              Til forsiden
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
