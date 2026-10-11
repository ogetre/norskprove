import { levelIndex } from "@/lib/levels";
import type { Level } from "@/lib/types";

/** Sorts tasks from A1 to B2, keeping the written order within each level. */
export function byLevel<T extends { level: Level }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => levelIndex(a.level) - levelIndex(b.level));
}
