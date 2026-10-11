import type { Metadata } from "next";
import { writingTasks, writingTests, WRITING_KIND_NAMES, type WritingKind } from "@/content/writing";
import { WritingHome } from "./WritingHome";

export const metadata: Metadata = { title: "Skriving" };

export default function WritingPage() {
  const kinds = Object.keys(WRITING_KIND_NAMES) as WritingKind[];
  return (
    <WritingHome
      groups={kinds.map((kind) => ({
        kind,
        name: WRITING_KIND_NAMES[kind],
        tasks: writingTasks
          .filter((t) => t.kind === kind)
          .map(({ id, title, level, task, minWords, maxWords }) => ({ id, title, level, task, minWords, maxWords })),
      }))}
      bands={writingTests.bands.map((b) => `${b.label} (${b.minutes} min)`)}
    />
  );
}
