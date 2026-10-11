import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { WritingExam } from "@/components/writing/WritingExam";
import { writingPools, writingTests } from "@/content/writing";

export const metadata: Metadata = { title: "Full delprøve i skriving" };

export default function WritingExamPage() {
  const bands = writingTests.bands.map((b) => ({ id: b.id, label: b.label, minutes: b.minutes, pools: writingPools(b) }));
  return (
    <Paywall skill="skriving" feature="Full delprøve">
      <WritingExam bands={bands} />
    </Paywall>
  );
}
