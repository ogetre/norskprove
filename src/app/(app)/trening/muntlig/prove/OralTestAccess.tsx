"use client";

import type { ComponentProps } from "react";
import { Paywall, useAccess } from "@/components/Access";
import { useOralInfo } from "@/lib/oral-check-client";
import { planCovers } from "@/lib/plans";
import { SpeakingExam } from "./SpeakingExam";

/**
 * The full oral test for subscribers, and once for everyone who is signed in: the free AI check
 * is a whole test, graded by the AI examiner. A started free test can be continued for a day.
 */
export function OralTestAccess({ bands }: { bands: ComponentProps<typeof SpeakingExam>["bands"] }) {
  const { plan, signedIn, loading, dev } = useAccess();
  const oral = useOralInfo();
  const covered = dev || planCovers(plan, "muntlig");

  if (loading || (!covered && signedIn && oral.state === "loading")) {
    return <div className="h-64 animate-pulse rounded-2xl bg-surface/60" aria-busy="true" />;
  }
  if (covered) return <SpeakingExam bands={bands} />;
  if (oral.state === "ready" && oral.allowance.free && (oral.allowance.left !== 0 || oral.open)) {
    return (
      <>
        <p className="mb-6 rounded-xl bg-note px-5 py-4 leading-relaxed text-note-ink">
          <span className="font-semibold">Prøv den muntlige prøven gratis.</span> Den første prøven med AI-vurdering er
          gratis: sensoren stiller oppfølgingsspørsmål, og du får nivå og tilbakemelding på uttalen.
        </p>
        <SpeakingExam bands={bands} free />
      </>
    );
  }
  return (
    <Paywall skill="muntlig" feature="Muntlig prøve">
      <SpeakingExam bands={bands} />
    </Paywall>
  );
}
