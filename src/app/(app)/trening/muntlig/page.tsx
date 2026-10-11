import type { Metadata } from "next";
import { SPEAKING_KIND_NAMES, speakingTasks, type SpeakingKind } from "@/content/speaking";
import { SpeakingHome } from "./SpeakingHome";

export const metadata: Metadata = { title: "Muntlig" };

export default function SpeakingPage() {
  const kinds = Object.keys(SPEAKING_KIND_NAMES) as SpeakingKind[];
  return (
    <SpeakingHome
      groups={kinds.map((kind) => ({
        kind,
        name: SPEAKING_KIND_NAMES[kind],
        tasks: speakingTasks
          .filter((t) => t.kind === kind)
          .map(({ id, title, level, intro, questions, speakSeconds }) => ({
            id,
            title,
            level,
            intro,
            questions: questions.length,
            speakSeconds,
          })),
      }))}
    />
  );
}
