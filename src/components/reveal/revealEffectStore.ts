"use client";

import { useSyncExternalStore } from "react";
import { safeStorage } from "@/lib/safeStorage";
import { storageKey } from "@/config";
import { DEFAULT_EFFECT_KEY, getEffect } from "./effects";

// Which holo effect the Mystery reveal uses. Admin picks it in Profile; it's
// stored in localStorage and shared across the app via useSyncExternalStore.

const KEY = storageKey("revealEffect:v1");
const listeners = new Set<() => void>();
let cached: string | null = null;

function read(): string {
  if (cached !== null) return cached;
  cached = safeStorage.get(KEY) || DEFAULT_EFFECT_KEY;
  return cached;
}

export function setRevealEffect(key: string) {
  cached = getEffect(key).key; // validate
  safeStorage.set(KEY, cached);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive selected effect key (defaults to DEFAULT_EFFECT_KEY). */
export function useRevealEffect(): string {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_EFFECT_KEY);
}
