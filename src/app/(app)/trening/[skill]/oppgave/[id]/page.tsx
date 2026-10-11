import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paywall } from "@/components/Access";
import { content, getTask } from "@/content";
import type { Skill } from "@/lib/types";
import { SingleTask } from "./SingleTask";
import { PageLoading } from "@/components/PageLoading";

export function generateStaticParams() {
  return Object.entries(content).flatMap(([skill, c]) => c.tasks.map((t) => ({ skill, id: t.id })));
}

export async function generateMetadata(props: PageProps<"/trening/[skill]/oppgave/[id]">): Promise<Metadata> {
  const { skill, id } = await props.params;
  return { title: getTask(skill as Skill, id)?.title ?? "Oppgave" };
}

async function TaskPageContent({ params }: { params: PageProps<"/trening/[skill]/oppgave/[id]">["params"] }) {
  const { skill, id } = await params;
  const tasks = content[skill as Skill]?.tasks;
  const task = getTask(skill as Skill, id);
  if (!tasks || !task) notFound();

  const next = tasks[(tasks.indexOf(task) + 1) % tasks.length];

  return (
    <Paywall skill={skill as Skill} feature="Oppgavene">
      <SingleTask skill={skill as Skill} task={task} next={{ id: next.id, title: next.title }} />
    </Paywall>
  );
}

// The route reads its params inside Suspense so navigation can show the shell right away.
export default function TaskPage(props: PageProps<"/trening/[skill]/oppgave/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <TaskPageContent params={props.params} />
    </Suspense>
  );
}
