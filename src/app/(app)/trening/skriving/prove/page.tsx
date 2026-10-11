import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { WritingExam } from "@/components/writing/WritingExam";
import { getWritingTask, writingTests } from "@/content/writing";

export const metadata: Metadata = { title: "Full delprøve i skriving" };

export default function WritingExamPage() {
  const bands = writingTests.bands.map((b) => ({ ...b, tasks: b.tasks.map((id) => getWritingTask(id)!) }));
  return (
    <Paywall skill="skriving" feature="Full delprøve">
      <WritingExam bands={bands} />
    </Paywall>
  );
}
