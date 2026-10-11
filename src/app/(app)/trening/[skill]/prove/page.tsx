import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paywall } from "@/components/Access";
import { TestRunner } from "@/components/TestRunner";
import { content, pickTasks } from "@/content";
import type { Skill } from "@/lib/types";
import { PageLoading } from "@/components/PageLoading";

export const metadata: Metadata = { title: "Full delprøve" };

async function FullTestPageContent({ params }: { params: PageProps<"/trening/[skill]/prove">["params"] }) {
  const { skill } = await params;
  const c = content[skill as Skill];
  if (!c) notFound();
  const s = skill as Skill;
  const { full } = c.tests;

  return (
    <Paywall skill={s} feature="Full delprøve">
      <TestRunner
        skill={s}
        mode="full"
        minutes={full.minutes}
        stage1={pickTasks(s, full.stage1)}
        easy={pickTasks(s, full.easy)}
        hard={pickTasks(s, full.hard)}
        backHref={`/trening/${s}`}
      />
    </Paywall>
  );
}

// The route reads its params inside Suspense so navigation can show the shell right away.
export default function FullTestPage(props: PageProps<"/trening/[skill]/prove">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <FullTestPageContent params={props.params} />
    </Suspense>
  );
}
