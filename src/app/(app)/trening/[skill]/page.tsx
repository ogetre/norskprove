import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SKILLS } from "@/components/SkillIcon";
import { content } from "@/content";
import { SKILL_NAMES, type QuestionKind, type Skill } from "@/lib/types";
import { SkillHome } from "./SkillHome";
import { PageLoading } from "@/components/PageLoading";

export function generateStaticParams() {
  // Writing and speaking have their own routes.
  return SKILLS.filter((s) => content[s.skill]).map((s) => ({ skill: s.skill }));
}

export async function generateMetadata(props: PageProps<"/trening/[skill]">): Promise<Metadata> {
  const { skill } = await props.params;
  return { title: SKILL_NAMES[skill as Skill] ?? "Trening" };
}

async function SkillPageContent({ params }: { params: PageProps<"/trening/[skill]">["params"] }) {
  const { skill } = await params;
  const info = SKILLS.find((s) => s.skill === skill);
  if (!info) notFound();

  const c = content[info.skill];
  const tasks = (c?.tasks ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          level: t.level,
          genre: t.genre,
          kinds: [...new Set(t.questions.map((q) => q.kind))] as QuestionKind[],
        }));

  return (
    <SkillHome
      skill={info.skill}
      official={info.official}
      ready={info.ready}
      tasks={tasks}
      fullMinutes={c?.tests.full.minutes ?? 0}
    />
  );
}

// The route reads its params inside Suspense so navigation can show the shell right away.
export default function SkillPage(props: PageProps<"/trening/[skill]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <SkillPageContent params={props.params} />
    </Suspense>
  );
}
