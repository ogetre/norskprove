import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paywall } from "@/components/Access";
import { content } from "@/content";
import { QUESTION_KIND_NAMES, type QuestionKind, type Skill } from "@/lib/types";
import { QuickPractice } from "./QuickPractice";
import { PageLoading } from "@/components/PageLoading";

const KINDS = Object.keys(QUESTION_KIND_NAMES) as QuestionKind[];

export function generateStaticParams() {
  return Object.entries(content).flatMap(([skill, c]) =>
    KINDS.filter((kind) => c.tasks.some((t) => t.questions.some((q) => q.kind === kind))).map((type) => ({ skill, type })),
  );
}

export async function generateMetadata(props: PageProps<"/trening/[skill]/hurtig/[type]">): Promise<Metadata> {
  const { type } = await props.params;
  return { title: QUESTION_KIND_NAMES[type as QuestionKind] ?? "Hurtigøving" };
}

async function QuickPageContent({ params }: { params: PageProps<"/trening/[skill]/hurtig/[type]">["params"] }) {
  const { skill, type } = await params;
  const c = content[skill as Skill];
  if (!c || !KINDS.includes(type as QuestionKind)) notFound();
  const kind = type as QuestionKind;

  // Practise only the questions of the chosen type, each with its text or recording.
  const tasks = c.tasks
    .filter((t) => t.questions.some((q) => q.kind === kind))
    .map((t) => ({ ...t, questions: t.questions.filter((q) => q.kind === kind) }));
  if (tasks.length === 0) notFound();

  return (
    <Paywall skill={skill as Skill} feature="Hurtigøving">
      <QuickPractice skill={skill as Skill} kind={kind} title={QUESTION_KIND_NAMES[kind]} tasks={tasks} />
    </Paywall>
  );
}

// The route reads its params inside Suspense so navigation can show the shell right away.
export default function QuickPage(props: PageProps<"/trening/[skill]/hurtig/[type]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <QuickPageContent params={props.params} />
    </Suspense>
  );
}
