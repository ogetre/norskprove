import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthShell, AuthUnavailable } from "@/components/AuthShell";
import { authEnabled } from "@/lib/auth-config";

export const metadata: Metadata = { title: "Opprett konto" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Start reisen mot B1"
      lead="Lag en gratis konto med Google på noen sekunder. Nivåtest, øvingsoppgaver og statistikk lagres på kontoen din."
    >
      {authEnabled ? (
        // Clerk reads the URL, so it renders after the static shell.
        <Suspense fallback={<div className="h-[480px] animate-pulse rounded-xl bg-white/70" />}>
          <SignUp />
        </Suspense>
      ) : (
        <AuthUnavailable />
      )}
    </AuthShell>
  );
}
