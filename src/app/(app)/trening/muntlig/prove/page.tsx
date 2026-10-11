import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { speakingPools, speakingTests } from "@/content/speaking";
import { SpeakingExam } from "./SpeakingExam";

export const metadata: Metadata = { title: "Muntlig prøve" };

export default function SpeakingExamPage() {
  const bands = speakingTests.bands.map((b) => ({ id: b.id, label: b.label, pools: speakingPools(b) }));
  return (
    <Paywall skill="muntlig" feature="Muntlig prøve">
      <SpeakingExam bands={bands} />
    </Paywall>
  );
}
