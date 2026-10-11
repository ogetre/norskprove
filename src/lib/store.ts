"use client";

import { useSyncExternalStore } from "react";
import type {
  AppState,
  Attempt,
  Level,
  Profile,
  Skill,
  SpeakingSubmission,
  SrsState,
  WritingSubmission,
} from "./types";
import { clearAllUnfinished } from "./unfinished";

/*
 * Progress lives in localStorage for now. Every write goes through `update`,
 * so moving to a server database later means replacing load/save only.
 */

const KEY = "norskproveklar:v1";
const CHANGE_EVENT = "norskproveklar:change";

export const initialState: AppState = {
  version: 1,
  profile: { onboarded: false },
  testLevels: {},
  attempts: [],
  writing: [],
  speaking: [],
  srs: {},
  grammarErrors: {},
  xp: 0,
  activeDays: [],
};

let cache: AppState | null = null;

function load(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...initialState, ...(JSON.parse(raw) as AppState) } : initialState;
  } catch {
    cache = initialState;
  }
  return cache;
}

function save(next: AppState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked (private mode); progress stays in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, load, () => initialState);
}

/** False during server render and hydration, true once real progress is loaded. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function update(fn: (s: AppState) => AppState) {
  save(fn(load()));
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return d.toLocaleDateString("sv-SE");
}

export function today(): string {
  return dayKey();
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function markActive(s: AppState, xp: number): AppState {
  const day = today();
  return {
    ...s,
    xp: s.xp + xp,
    activeDays: s.activeDays.includes(day) ? s.activeDays : [...s.activeDays, day],
  };
}

/* ---------- Actions ---------- */

export function saveProfile(profile: Partial<Profile>) {
  update((s) => ({ ...s, profile: { ...s.profile, ...profile } }));
}

export function saveTestLevels(levels: Partial<Record<Skill, Level>>) {
  update((s) => markActive({ ...s, testLevels: { ...s.testLevels, ...levels } }, 50));
}

export function recordAttempt(a: Omit<Attempt, "id" | "at">) {
  update((s) =>
    markActive(
      {
        ...s,
        attempts: [...s.attempts, { ...a, id: newId(), at: new Date().toISOString() }],
      },
      10 + a.correct * 5,
    ),
  );
}

export function addWriting(sub: Omit<WritingSubmission, "id" | "at">): string {
  const id = newId();
  update((s) => {
    const errors = { ...s.grammarErrors };
    for (const e of sub.feedback?.errors ?? []) {
      errors[e.topic] = (errors[e.topic] ?? 0) + 1;
    }
    return markActive(
      {
        ...s,
        grammarErrors: errors,
        writing: [{ ...sub, id, at: new Date().toISOString() }, ...s.writing],
      },
      0,
    );
  });
  return id;
}

export function addSpeaking(sub: Omit<SpeakingSubmission, "id" | "at">): string {
  const id = newId();
  update((s) =>
    markActive(
      { ...s, speaking: [{ ...sub, id, at: new Date().toISOString() }, ...s.speaking] },
      0,
    ),
  );
  return id;
}

export function reviewCard(cardId: string, next: SrsState) {
  update((s) => markActive({ ...s, srs: { ...s.srs, [cardId]: next } }, 2));
}

export function resetProgress() {
  save(initialState);
  clearAllUnfinished();
}

/* ---------- Account sync helpers (used by ProgressSync) ---------- */

const OWNER_KEY = "norskproveklar:owner";

/** Id of the signed-in user the local progress belongs to; null for guest progress. */
export function getOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

export function setOwner(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(OWNER_KEY, userId);
    else window.localStorage.removeItem(OWNER_KEY);
  } catch {
    // ignore blocked storage
  }
}

export function getState(): AppState {
  return load();
}

export function replaceState(next: AppState) {
  save(next);
}

export function onStateChange(cb: () => void) {
  return subscribe(cb);
}

/** Combines guest progress with what the account already has; account values win on conflicts. */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const union = <T extends { id: string; at: string }>(a: T[], b: T[]) => {
    const map = new Map<string, T>();
    for (const item of [...a, ...b]) map.set(item.id, item);
    return [...map.values()].sort((x, y) => x.at.localeCompare(y.at));
  };

  const srs = { ...local.srs };
  for (const [id, card] of Object.entries(remote.srs ?? {})) {
    if (!srs[id] || card.reps >= srs[id].reps) srs[id] = card;
  }

  const grammarErrors = { ...local.grammarErrors };
  for (const [topic, n] of Object.entries(remote.grammarErrors ?? {})) {
    grammarErrors[topic] = Math.max(grammarErrors[topic] ?? 0, n);
  }

  return {
    ...initialState,
    profile: {
      ...local.profile,
      ...remote.profile,
      onboarded: local.profile.onboarded || remote.profile?.onboarded || false,
    },
    testLevels: { ...local.testLevels, ...remote.testLevels },
    attempts: union(local.attempts, remote.attempts ?? []),
    writing: union(local.writing, remote.writing ?? []).reverse(),
    speaking: union(local.speaking, remote.speaking ?? []).reverse(),
    srs,
    grammarErrors,
    xp: Math.max(local.xp, remote.xp ?? 0),
    activeDays: [...new Set([...local.activeDays, ...(remote.activeDays ?? [])])].sort(),
  };
}

/* ---------- Derived values ---------- */

export function streak(days: string[]): number {
  const set = new Set(days);
  let count = 0;
  const d = new Date();
  // Today not done yet keeps yesterday's streak alive.
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
