import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FreshVisit } from "@/components/FreshVisit";
import { SKILLS } from "@/components/SkillIcon";
import { TestRunner } from "@/components/TestRunner";
import { content, pickTasks } from "@/content";
import { authEnabled } from "@/lib/auth-config";
import { SKILL_NAMES, type Skill } from "@/lib/types";
import { TrialOffer } from "./TrialOffer";
import { PageLoading } from "@/components/PageLoading";

export function generateStaticParams() {
  // Writing and speaking have their own routes.
  return SKILLS.filter((s) => content[s.skill]).map((s) => ({ skill: s.skill }));
}

export async function generateMetadata(props: PageProps<"/provetest/[skill]">): Promise<Metadata> {
  const { skill } = await props.params;
  return { title: `Prøvetest i ${SKILL_NAMES[skill as Skill]?.toLowerCase() ?? "norsk"}` };
}

async function TrialPageContent({ params }: { params: PageProps<"/provetest/[skill]">["params"] }) {
  const { skill } = await params;
  const info = SKILLS.find((s) => s.skill === skill);
  if (!info || !info.ready) notFound();

  const c = content[info.skill];
  if (!c) notFound();
  const tasks = pickTasks(info.skill, c.tests.trial);

  return (
    <FreshVisit>
      <TestRunner
        skill={info.skill}
        mode="trial"
        minutes={info.trialMinutes}
        stage1={tasks}
        backHref="/provetest"
        afterResult={<TrialOffer authEnabled={authEnabled} />}
      />
    </FreshVisit>
  );
}

// The route reads its params inside Suspense so navigation can show the shell right away.
export default function TrialPage(props: PageProps<"/provetest/[skill]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <TrialPageContent params={props.params} />
    </Suspense>
  );
}
