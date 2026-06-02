"use client";

// Some embedded browsers / WebViews (e.g. Android TV WebView fallback, some
// emulators) DENY access to localStorage — even *reading* the `localStorage`
// property throws a SecurityError. This wrapper makes every access safe: it
// falls back to an in-memory map so the app keeps working (just without
// cross-session persistence) instead of crashing with
// "Failed to read the 'localStorage' property from 'Window'".

const memory: Record<string, string> = {};

function ls(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null; // access to the property itself was blocked
  }
}

export const safeStorage = {
  get(key: string): string | null {
    const store = ls();
    if (!store) return key in memory ? memory[key] : null;
    try {
      return store.getItem(key);
    } catch {
      return key in memory ? memory[key] : null;
    }
  },
  set(key: string, value: string): void {
    const store = ls();
    memory[key] = value; // always keep an in-memory copy
    if (!store) return;
    try {
      store.setItem(key, value);
    } catch {
      /* quota / blocked — in-memory copy already kept */
    }
  },
  remove(key: string): void {
    delete memory[key];
    const store = ls();
    if (!store) return;
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
