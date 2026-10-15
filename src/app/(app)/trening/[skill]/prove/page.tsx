import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paywall } from "@/components/Access";
import { FreshVisit } from "@/components/FreshVisit";
import { FullTest } from "@/components/FullTest";
import { content } from "@/content";
import type { Skill } from "@/lib/types";
import { PageLoading } from "@/components/PageLoading";

export const metadata: Metadata = { title: "Full delprøve" };

async function FullTestPageContent({ params }: { params: PageProps<"/trening/[skill]/prove">["params"] }) {
  const { skill } = await params;
  const c = content[skill as Skill];
  if (!c) notFound();
  const s = skill as Skill;

  return (
    <FreshVisit>
      <Paywall skill={s} feature="Full delprøve">
        <FullTest skill={s} tasks={c.tasks} plan={c.tests.full} />
      </Paywall>
    </FreshVisit>
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
