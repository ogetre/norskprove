import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Golos_Text, Unbounded } from "next/font/google";
import { ProgressSync } from "@/components/ProgressSync";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { themeScript } from "@/lib/theme-script";
import { authEnabled } from "@/lib/auth-config";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-theme";
import { FREE_BETA } from "@/lib/plans";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} – forbered deg til Norskprøven`,
    template: `%s – ${SITE_NAME}`,
  },
  description: `Øv til Norskprøven: lesing, lytting, skriving og muntlig. Oppgaver i samme format som på prøven, med forklaringer.${FREE_BETA ? " Gratis mens vi tester." : ""}`,
  // The preview image is opengraph-image.png next to this file.
  openGraph: { siteName: SITE_NAME, locale: "nb_NO", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nb"
      className={`${golos.variable} ${unbounded.variable} h-full antialiased`}
      // data-theme is set by the inline script before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* With cache components, ClerkProvider belongs inside <body>. */}
        {authEnabled ? (
          <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
            <ProgressSync />
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
        <SiteAnalytics />
      </body>
    </html>
  );
}
