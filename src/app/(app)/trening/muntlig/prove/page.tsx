import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { getSpeakingTask, speakingTests } from "@/content/speaking";
import { SpeakingExam } from "./SpeakingExam";

export const metadata: Metadata = { title: "Muntlig prøve" };

export default function SpeakingExamPage() {
  const bands = speakingTests.bands.map((b) => ({ ...b, tasks: b.tasks.map((id) => getSpeakingTask(id)!) }));
  return (
    <Paywall skill="muntlig" feature="Muntlig prøve">
      <SpeakingExam bands={bands} />
    </Paywall>
  );
}
