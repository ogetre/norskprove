"use client";

import { useSyncExternalStore } from "react";
import type { Skill } from "./types";

/*
 * Unfinished full tests (delprøver), kept on this device so they can be continued later.
 * One per skill; each test decides what it stores.
 */

const PREFIX = "norskproveklar:delprove:";
const SKILLS: Skill[] = ["lesing", "lytting", "skriving", "muntlig"];

function raw(skill: Skill): string | null {
  try {
    return window.localStorage.getItem(PREFIX + skill);
  } catch {
    return null;
  }
}

export function loadUnfinished<T>(skill: Skill): T | null {
  const value = raw(skill);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function saveUnfinished(skill: Skill, value: object) {
  try {
    window.localStorage.setItem(PREFIX + skill, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the test just can't be resumed.
  }
}

export function clearUnfinished(skill: Skill) {
  try {
    window.localStorage.removeItem(PREFIX + skill);
  } catch {
    // ignore blocked storage
  }
}

export function clearAllUnfinished() {
  SKILLS.forEach(clearUnfinished);
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Whether there is an unfinished test for this skill. False during server render and hydration. */
export function useHasUnfinished(skill: Skill): boolean {
  return useSyncExternalStore(
    subscribe,
    () => raw(skill) !== null,
    () => false,
  );
}

/** «12. oktober kl. 14:05» */
export function savedAtLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })} kl. ${d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
}
