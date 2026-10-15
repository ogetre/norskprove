import type { ReadingTask } from "@/lib/types";
import { InteractiveParagraph } from "./words/InteractiveText";
import { WordLookupProvider } from "./words/WordLookup";

/** A reading text. Interactive outside tests: words can be tapped and paragraphs translated. */
export function ReadingText({
  task,
  compact = false,
  interactive = false,
}: {
  task: ReadingTask;
  compact?: boolean;
  interactive?: boolean;
}) {
  const card = (
    <div
      className={`rounded-xl border-l-4 border-rorbu bg-surface leading-relaxed shadow-[0_24px_50px_-34px_rgb(15_43_60/0.45)] ring-1 ring-ice ${compact ? "p-5 text-base" : "p-6 text-[17px] sm:p-8"}`}
    >
      {task.paragraphs.map((p, i) =>
        interactive ? (
          <InteractiveParagraph key={i} text={p} taskId={task.id} block={i} className={i ? "mt-4" : ""} />
        ) : (
          <p key={i} className={i ? "mt-4" : ""}>
            {p}
          </p>
        ),
      )}
      {task.signature && <p className="mt-4 text-granite">{task.signature}</p>}
    </div>
  );
  if (!interactive) return card;
  return (
    <WordLookupProvider>
      <p className="mb-2 text-sm text-granite">Trykk på et ord for å se hva det betyr. Knappen ved avsnittet oversetter det.</p>
      {card}
    </WordLookupProvider>
  );
}
