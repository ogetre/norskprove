"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useSyncExternalStore } from "react";
import {
  getOwner,
  getState,
  initialState,
  mergeStates,
  onStateChange,
  replaceState,
  resetProgress,
  setOwner,
} from "@/lib/store";
import type { AppState } from "@/lib/types";

export type SyncStatus = "guest" | "loading" | "saving" | "saved" | "error";

let status: SyncStatus = "guest";
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => "guest" as SyncStatus,
  );
}

async function push(state: AppState) {
  setStatus("saving");
  try {
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    setStatus(res.ok ? "saved" : "error");
  } catch {
    setStatus("error");
  }
}

/**
 * Keeps local progress and the account in step: on sign-in it merges guest
 * progress into the account, then saves every change after a short pause.
 */
export function ProgressSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      // Signed out: drop the previous account's progress from this device.
      if (getOwner()) {
        setOwner(null);
        resetProgress();
      }
      setStatus("guest");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    let unsubscribe: (() => void) | undefined;

    const flush = () => {
      if (!pending) return;
      pending = false;
      const body = JSON.stringify({ state: getState() });
      navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };

    (async () => {
      setStatus("loading");
      let remote: AppState | null = null;
      try {
        const res = await fetch("/api/progress", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        remote = (await res.json()).state;
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;

      // Progress left by another account on this device is not merged in.
      const owner = getOwner();
      const local = owner && owner !== userId ? initialState : getState();
      const merged = remote ? mergeStates(local, remote) : local;
      setOwner(userId);
      replaceState(merged);
      await push(merged);

      unsubscribe = onStateChange(() => {
        pending = true;
        setStatus("saving");
        clearTimeout(timer);
        timer = setTimeout(() => {
          pending = false;
          void push(getState());
        }, 1200);
      });
      document.addEventListener("visibilitychange", onHide);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
