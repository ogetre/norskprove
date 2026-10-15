"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

/**
 * Starts a test over on every visit by link. Next keeps visited pages alive in the
 * background (React Activity), so without this a finished test came back instead of a
 * new one. Back and forward still return to where the learner left off; an unfinished
 * test is offered again from its saved progress.
 */
export function FreshVisit({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
