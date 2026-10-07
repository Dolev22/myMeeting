"use client";

import { useSyncExternalStore } from "react";
import { DEMO_DATA_VERSION, buildSeedData, type DemoData } from "@/lib/demo/seed";

// The standalone demo's "database": one JSON document in this browser's
// localStorage. Nothing here talks to Supabase, a Server Action, or any
// network endpoint — which is the point: the demo keeps working when the
// hosted backend is paused, and nothing a visitor does can reach real data.
//
// It is deliberately NOT an auth mechanism. No cookie or flag is set that
// the server reads; the real app's routes still require a real Supabase
// session and still go through RLS.

const STORAGE_KEY = "mymeeting.demo.v1";

let cache: DemoData | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStorage(): DemoData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoData;
    if (parsed?.version !== DEMO_DATA_VERSION || !Array.isArray(parsed.leads)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(data: DemoData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable or full (private browsing, quota): the demo still
    // works from the in-memory copy for this tab, it just won't persist.
  }
}

export function getDemoData(): DemoData {
  if (!cache) {
    cache = readStorage();
    if (!cache) {
      cache = buildSeedData();
      writeStorage(cache);
    }
  }
  return cache;
}

/** Applies a change to a draft copy, persists it, and notifies subscribers. */
export function updateDemoData(mutate: (draft: DemoData) => void): DemoData {
  const draft = structuredClone(getDemoData());
  mutate(draft);
  cache = draft;
  writeStorage(draft);
  emit();
  return draft;
}

/** Restores the original sample data — for this browser only. */
export function resetDemoData(): void {
  cache = buildSeedData();
  writeStorage(cache);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep several tabs of the demo in sync with each other.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): DemoData | null {
  return null;
}

/**
 * The current demo dataset, or `null` during server rendering / before
 * hydration (localStorage doesn't exist there) — callers render a short
 * loading state for that first frame.
 */
export function useDemoData(): DemoData | null {
  return useSyncExternalStore(subscribe, getDemoData, getServerSnapshot);
}
