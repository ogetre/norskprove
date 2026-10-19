import type { Metadata } from "next";
import { FreshVisit } from "@/components/FreshVisit";
import { speakingPools, speakingTests } from "@/content/speaking";
import { OralTestAccess } from "./OralTestAccess";

export const metadata: Metadata = { title: "Muntlig prøve" };

export default function SpeakingExamPage() {
  const bands = speakingTests.bands.map((b) => ({ id: b.id, label: b.label, parts: b.slots.map((s) => s.label), pools: speakingPools(b) }));
  return (
    <FreshVisit>
      <OralTestAccess bands={bands} />
    </FreshVisit>
  );
}
