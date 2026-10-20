import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Golos_Text, Unbounded } from "next/font/google";
import { ProgressSync } from "@/components/ProgressSync";
import { themeScript } from "@/lib/theme-script";
import { authEnabled } from "@/lib/auth-config";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-theme";
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
  title: {
    default: "NorskprøveKlar – forbered deg til Norskprøven",
    template: "%s – NorskprøveKlar",
  },
  description:
    "Øv til Norskprøven: lesing, lytting, skriving og muntlig. Oppgaver i samme format som på prøven, med forklaringer.",
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
        {/* Page views without cookies, to see how much the free beta is used. */}
        <Analytics />
      </body>
    </html>
  );
}
