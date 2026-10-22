import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthShell, AuthUnavailable } from "@/components/AuthShell";
import { authEnabled } from "@/lib/auth-config";

export const metadata: Metadata = { title: "Logg inn" };

export default function SignInPage() {
  return (
    <AuthShell
      title="Velkommen tilbake"
      lead="Logg inn med Google eller e-post og fortsett der du slapp i forberedelsene til Norskprøven."
    >
      {authEnabled ? (
        // Clerk reads the URL, so it renders after the static shell.
        <Suspense fallback={<div className="h-[480px] animate-pulse rounded-xl bg-surface/70" />}>
          <SignIn />
        </Suspense>
      ) : (
        <AuthUnavailable />
      )}
    </AuthShell>
  );
}
