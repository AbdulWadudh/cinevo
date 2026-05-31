// Shared (non-client) source provider keys so both the server page and the
// client player resolve `?source=<name>` consistently. Order MUST match the
// PROVIDERS array in src/components/player/IframePlayer.tsx.
export const SOURCE_KEYS = ["cinesrc", "vidcore", "lordflix"] as const;

/** Resolve a source query-param name (e.g. "cinesrc") to a provider index. Falls back to CineSrc. */
export function sourceIndexFromKey(key?: string): number {
  const i = SOURCE_KEYS.indexOf(key as (typeof SOURCE_KEYS)[number]);
  return i >= 0 ? i : 0; // default CineSrc
}
