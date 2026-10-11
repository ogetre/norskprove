import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Paywall } from "@/components/Access";
import { PageLoading } from "@/components/PageLoading";
import { getSpeakingTask, speakingTasks } from "@/content/speaking";
import { SpeakingTaskView } from "./SpeakingTaskView";

export function generateStaticParams() {
  return speakingTasks.map((t) => ({ id: t.id }));
}

export async function generateMetadata(props: PageProps<"/trening/muntlig/oppgave/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: getSpeakingTask(id)?.title ?? "Muntlig" };
}

async function Content({ params }: { params: PageProps<"/trening/muntlig/oppgave/[id]">["params"] }) {
  const { id } = await params;
  const task = getSpeakingTask(id);
  if (!task) notFound();
  const next = speakingTasks[(speakingTasks.indexOf(task) + 1) % speakingTasks.length];

  return (
    <Paywall skill="muntlig" feature="Muntlig øving">
      <SpeakingTaskView task={task} next={{ id: next.id, title: next.title }} />
    </Paywall>
  );
}

export default function SpeakingTaskPage(props: PageProps<"/trening/muntlig/oppgave/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={props.params} />
    </Suspense>
  );
}
