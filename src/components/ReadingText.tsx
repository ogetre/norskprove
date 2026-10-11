import type { ReadingTask } from "@/lib/types";

export function ReadingText({ task, compact = false }: { task: ReadingTask; compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border-l-4 border-rorbu bg-surface leading-relaxed shadow-[0_24px_50px_-34px_rgb(15_43_60/0.45)] ring-1 ring-ice ${compact ? "p-5 text-base" : "p-6 text-[17px] sm:p-8"}`}
    >
      {task.paragraphs.map((p, i) => (
        <p key={i} className={i ? "mt-4" : ""}>
          {p}
        </p>
      ))}
      {task.signature && <p className="mt-4 text-granite">{task.signature}</p>}
    </div>
  );
}
