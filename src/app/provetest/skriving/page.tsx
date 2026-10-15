import type { Metadata } from "next";
import { FreshVisit } from "@/components/FreshVisit";
import { WritingPractice } from "@/components/writing/WritingPractice";
import { getWritingTask, writingTests } from "@/content/writing";
import { authEnabled } from "@/lib/auth-config";
import { TrialOffer } from "../[skill]/TrialOffer";

export const metadata: Metadata = { title: "Prøvetest i skriving" };

export default function WritingTrialPage() {
  const task = getWritingTask(writingTests.trial)!;
  return (
    <>
      <p className="text-sm text-granite">Gratis prøvetest</p>
      <h1 className="mt-1 mb-8 font-display text-3xl font-medium tracking-tight sm:text-4xl">Skriving</h1>
      <FreshVisit>
        <WritingPractice task={task} mode="trial" timed after={<TrialOffer authEnabled={authEnabled} />} />
      </FreshVisit>
    </>
  );
}
