import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { FreshVisit } from "@/components/FreshVisit";
import { speakingPools, speakingTests } from "@/content/speaking";
import { SpeakingExam } from "./SpeakingExam";

export const metadata: Metadata = { title: "Muntlig prøve" };

export default function SpeakingExamPage() {
  const bands = speakingTests.bands.map((b) => ({ id: b.id, label: b.label, pools: speakingPools(b) }));
  return (
    <FreshVisit>
      <Paywall skill="muntlig" feature="Muntlig prøve">
        <SpeakingExam bands={bands} />
      </Paywall>
    </FreshVisit>
  );
}
