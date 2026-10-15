"use client";

import { isListening, type ExamTask } from "@/lib/types";
import { ListeningPlayer } from "./ListeningPlayer";
import { ReadingText } from "./ReadingText";
import { WordLookupProvider } from "./words/WordLookup";

/** The text to read or the recording to hear for a task. */
export function Stimulus({
  task,
  mode,
  plays = 0,
  onPlay = () => {},
}: {
  task: ExamTask;
  /** exam: limited plays, no transcript. practice: free replays. review: transcript shown. */
  mode: "exam" | "practice" | "review";
  plays?: number;
  onPlay?: () => void;
}) {
  if (isListening(task)) {
    const player = (
      <ListeningPlayer
        key={task.id}
        task={task}
        plays={plays}
        onPlay={onPlay}
        limit={mode === "exam"}
        showTranscript={mode === "review"}
      />
    );
    // The word card sits outside the dark player, so it follows the page's theme.
    return mode === "exam" ? player : <WordLookupProvider>{player}</WordLookupProvider>;
  }
  return <ReadingText task={task} compact={mode === "review"} interactive={mode !== "exam"} />;
}
