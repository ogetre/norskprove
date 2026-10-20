import type { MetadataRoute } from "next";
import { content } from "@/content";
import { speakingTasks } from "@/content/speaking";
import { writingTasks } from "@/content/writing";
import { SITE_URL } from "@/lib/site";

/*
 * The public pages for search engines: the landing page, the trial tests, the training pages and
 * every task. Pages that only show the learner's own data (overview, mistakes, words) are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({ url: `${SITE_URL}${path}`, priority });
  return [
    page("/", 1),
    page("/provetest", 0.9),
    ...["lesing", "lytting", "skriving", "muntlig"].flatMap((skill) => [
      page(`/provetest/${skill}`, 0.8),
      page(`/trening/${skill}`, 0.8),
      page(`/trening/${skill}/prove`, 0.7),
    ]),
    page("/trening", 0.8),
    page("/priser", 0.6),
    ...Object.entries(content).flatMap(([skill, c]) => c.tasks.map((t) => page(`/trening/${skill}/oppgave/${t.id}`, 0.5))),
    ...writingTasks.map((t) => page(`/trening/skriving/oppgave/${t.id}`, 0.5)),
    ...speakingTasks.map((t) => page(`/trening/muntlig/oppgave/${t.id}`, 0.5)),
    page("/kontakt", 0.3),
    page("/personvern", 0.2),
    page("/vilkar", 0.2),
  ];
}
