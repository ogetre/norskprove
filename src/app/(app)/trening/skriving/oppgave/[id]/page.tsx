import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Paywall } from "@/components/Access";
import { PageLoading } from "@/components/PageLoading";
import { getWritingTask, writingTasks } from "@/content/writing";
import { WritingTaskView } from "./WritingTaskView";

export function generateStaticParams() {
  return writingTasks.map((t) => ({ id: t.id }));
}

export async function generateMetadata(props: PageProps<"/trening/skriving/oppgave/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: getWritingTask(id)?.title ?? "Skriving" };
}

async function Content({ params }: { params: PageProps<"/trening/skriving/oppgave/[id]">["params"] }) {
  const { id } = await params;
  const task = getWritingTask(id);
  if (!task) notFound();
  const next = writingTasks[(writingTasks.indexOf(task) + 1) % writingTasks.length];

  return (
    <Paywall skill="skriving" feature="Skriving">
      <WritingTaskView task={task} next={{ id: next.id, title: next.title }} />
    </Paywall>
  );
}

export default function WritingTaskPage(props: PageProps<"/trening/skriving/oppgave/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={props.params} />
    </Suspense>
  );
}
