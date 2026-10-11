import type { Metadata } from "next";
import { SpeakingSession } from "@/components/speaking/SpeakingSession";
import { getSpeakingTask, speakingTests } from "@/content/speaking";
import { authEnabled } from "@/lib/auth-config";
import { TrialOffer } from "../[skill]/TrialOffer";

export const metadata: Metadata = { title: "Prøvetest i muntlig" };

export default function SpeakingTrialPage() {
  const task = getSpeakingTask(speakingTests.trial)!;
  // The trial uses only the first question.
  const short = { ...task, questions: task.questions.slice(0, 1) };
  return (
    <>
      <p className="text-sm text-granite">Gratis prøvetest</p>
      <h1 className="mt-1 mb-8 font-display text-3xl font-medium tracking-tight sm:text-4xl">Muntlig</h1>
      <SpeakingSession tasks={[short]} mode="trial" title="Prøvetest i muntlig" after={<TrialOffer authEnabled={authEnabled} />} />
    </>
  );
}
