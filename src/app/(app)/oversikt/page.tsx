import type { Metadata } from "next";
import { listeningTasks } from "@/content/listening";
import { readingTasks } from "@/content/reading";
import { speakingTasks } from "@/content/speaking";
import { writingTasks } from "@/content/writing";
import { authEnabled } from "@/lib/auth-config";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "Oversikt" };

export default function OverviewPage() {
  return (
    <Dashboard
      authEnabled={authEnabled}
      reading={readingTasks.map(({ id, title, level }) => ({ id, title, level }))}
      titles={Object.fromEntries(
        [...readingTasks, ...listeningTasks, ...writingTasks, ...speakingTasks].map((t) => [t.id, t.title]),
      )}
    />
  );
}
