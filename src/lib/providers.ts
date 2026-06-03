// Shared (non-server) provider helpers. URL templates support the placeholders
// {id}, {season}, {episode}. Keep this free of server-only imports so both the
// client player and server code can use it.

import { storageKey } from "@/config";

/* ─── Sandbox modes ──────────────────────────────────────────────
   Ad vectors in third-party embeds are popups (popunders) and top-window
   redirects — the browser blocks both unless the sandbox grants them. These
   token sets deliberately omit allow-popups / allow-top-navigation / allow-modals.
     • strict   — minimal perms; max isolation, may break finicky players.
     • balanced — generous-but-popup-free; blocks ads, plays on most providers (default).
     • off      — no sandbox at all (ads possible); last resort for providers
                  that refuse to run sandboxed. */
export type SandboxMode = "strict" | "balanced" | "off";

export const SANDBOX_MODES: SandboxMode[] = ["balanced", "strict", "off"];

/** The iframe `sandbox` attribute value for a mode, or null to omit it. */
export function sandboxTokens(mode: SandboxMode): string | null {
  switch (mode) {
    case "off":
      return null;
    case "strict":
      return "allow-scripts allow-same-origin";
    case "balanced":
    default:
      return "allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock";
  }
}

export function normalizeSandboxMode(v: unknown): SandboxMode {
  return v === "strict" || v === "balanced" || v === "off" ? v : "balanced";
}

export interface PlayerProvider {
  id: string;
  key: string;
  label: string;
  sub: string | null;
  movieUrl: string;
  tvUrl: string;
  sandboxMode: SandboxMode;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
}

/** Input shape for create/update — everything except server-managed fields. */
export type ProviderInput = {
  key: string;
  label: string;
  sub?: string | null;
  movieUrl: string;
  tvUrl: string;
  sandboxMode: SandboxMode;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
};

/* ─── localStorage cache (version + TTL) ─────────────────────────
   Providers are loaded from the DB once, then cached in localStorage.
   Bump CACHE_VERSION whenever the cached shape changes — old caches are
   discarded automatically. Entries older than CACHE_TTL_MS are treated as
   stale and re-fetched. The in-app "refresh" button clears the cache
   regardless of age. */
export const PROVIDERS_CACHE_KEY = storageKey("providers:v1");
export const PROVIDERS_CACHE_VERSION = 3;
export const PROVIDERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Remembers the provider key the user last played on (their personal base). */
export const LAST_PROVIDER_KEY = storageKey("lastProvider");

export interface ProvidersCache {
  version: number;
  fetchedAt: number;
  providers: PlayerProvider[];
}

/** Fill a provider URL template for a given title. Supports an optional
 * {progress} placeholder (resume point, in seconds) for providers that accept it. */
export function buildEmbedUrl(
  provider: Pick<PlayerProvider, "movieUrl" | "tvUrl">,
  mediaId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
  progress?: number
): string {
  const template = mediaType === "tv" ? provider.tvUrl : provider.movieUrl;
  return template
    .replaceAll("{id}", String(mediaId))
    .replaceAll("{season}", String(season ?? 1))
    .replaceAll("{episode}", String(episode ?? 1))
    .replaceAll("{progress}", String(Math.max(0, Math.floor(progress ?? 0))));
}

/**
 * Resolve the initial provider index. Prefers an explicit `?source=<key>`;
 * otherwise falls back to the admin-marked default provider, then index 0.
 */
export function providerIndexFromKey(providers: { key: string; isDefault?: boolean }[], key?: string): number {
  if (key) {
    const i = providers.findIndex((p) => p.key === key);
    if (i >= 0) return i;
  }
  const def = providers.findIndex((p) => p.isDefault);
  return def >= 0 ? def : 0;
}

/** Seed data inserted on first run when the Source table is empty. */
export const DEFAULT_PROVIDERS: Omit<PlayerProvider, "id">[] = [
  {
    key: "cinesrc", label: "CineSrc", sub: "Server Alpha", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 3,
    movieUrl: "https://cinesrc.st/embed/movie/{id}", tvUrl: "https://cinesrc.st/embed/tv/{id}?s={season}&e={episode}"
  },
  {
    key: "vidcore", label: "VidCore", sub: "Server Beta", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 1,
    movieUrl: "https://vidcore.net/movie/{id}", tvUrl: "https://vidcore.net/tv/{id}/{season}/{episode}"
  },
  {
    key: "lordflix", label: "LordFlix", sub: "Server Gamma", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 2,
    movieUrl: "https://lordflix.org/watch/movie/{id}", tvUrl: "https://lordflix.org/watch/tv/{id}/{season}/{episode}"
  },
  {
    key: "videasy", label: "Videasy", sub: "Server Delta", sandboxMode: "balanced", enabled: true, isDefault: true, sortOrder: 1,
    movieUrl: "https://player.videasy.net/movie/{id}", tvUrl: "https://player.videasy.net/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidlink", label: "VidLink", sub: "Server Echo", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 4,
    movieUrl: "https://vidlink.pro/movie/{id}", tvUrl: "https://vidlink.pro/tv/{id}/{season}/{episode}"
  },
  {
    key: "vixsrc", label: "VixSrc", sub: "Server Foxtrot", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 5,
    movieUrl: "https://vixsrc.to/movie/{id}", tvUrl: "https://vixsrc.to/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidfast", label: "VidFast", sub: "Server Golf", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 6,
    movieUrl: "https://vidfast.pro/movie/{id}", tvUrl: "https://vidfast.pro/tv/{id}/{season}/{episode}"
  },
  {
    key: "toustream", label: "TouStream", sub: "Server Hotel", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 7,
    movieUrl: "https://toustream.xyz/tou/movie/{id}", tvUrl: "https://toustream.xyz/tou/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidzee", label: "VidZee", sub: "Server India", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 8,
    movieUrl: "https://player.vidzee.wtf/embed/movie/{id}", tvUrl: "https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidsrc", label: "VidSrc", sub: "Server Juliett", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 9,
    movieUrl: "https://vidsrc.cc/v2/embed/movie/{id}", tvUrl: "https://vidsrc.cc/v2/embed/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidnest", label: "VidNest", sub: "Server Kilo", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 10,
    movieUrl: "https://vidnest.fun/movie/{id}", tvUrl: "https://vidnest.fun/tv/{id}/{season}/{episode}"
  },
  {
    key: "thisiscinema", label: "ThisIsCinema", sub: "Server Lima", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 11,
    movieUrl: "https://thisiscinema.pages.dev/?version=v5&type=movie&id={id}", tvUrl: "https://thisiscinema.pages.dev/?version=v5&type=tv&id={id}&season={season}&episode={episode}"
  },
  {
    key: "primewire", label: "PrimeWire", sub: "Server Mike", sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 12,
    movieUrl: "https://primewire.mov/embed/movie?tmdb={id}", tvUrl: "https://primewire.mov/embed/tv?tmdb={id}&season={season}&episode={episode}"
  },
];
