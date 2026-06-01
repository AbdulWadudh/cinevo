// Shared (non-server) provider helpers. URL templates support the placeholders
// {id}, {season}, {episode}. Keep this free of server-only imports so both the
// client player and server code can use it.

export interface PlayerProvider {
  id: string;
  key: string;
  label: string;
  sub: string | null;
  movieUrl: string;
  tvUrl: string;
  sandboxEnabled: boolean;
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
  sandboxEnabled: boolean;
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
export const PROVIDERS_CACHE_KEY = "cinevo:providers:v1";
export const PROVIDERS_CACHE_VERSION = 2;
export const PROVIDERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Remembers the provider key the user last played on (their personal base). */
export const LAST_PROVIDER_KEY = "cinevo:lastProvider";

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
    key: "cinesrc", label: "CineSrc", sub: "Server Alpha", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 3,
    movieUrl: "https://cinesrc.st/embed/movie/{id}", tvUrl: "https://cinesrc.st/embed/tv/{id}?s={season}&e={episode}"
  },
  {
    key: "vidcore", label: "VidCore", sub: "Server Beta", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 1,
    movieUrl: "https://vidcore.net/movie/{id}", tvUrl: "https://vidcore.net/tv/{id}/{season}/{episode}"
  },
  {
    key: "lordflix", label: "LordFlix", sub: "Server Gamma", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 2,
    movieUrl: "https://lordflix.org/watch/movie/{id}", tvUrl: "https://lordflix.org/watch/tv/{id}/{season}/{episode}"
  },
  {
    key: "videasy", label: "Videasy", sub: "Server Delta", sandboxEnabled: false, enabled: true, isDefault: true, sortOrder: 1,
    movieUrl: "https://player.videasy.net/movie/{id}", tvUrl: "https://player.videasy.net/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidlink", label: "VidLink", sub: "Server Echo", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 4,
    movieUrl: "https://vidlink.pro/movie/{id}", tvUrl: "https://vidlink.pro/tv/{id}/{season}/{episode}"
  },
  {
    key: "vixsrc", label: "VixSrc", sub: "Server Foxtrot", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 5,
    movieUrl: "https://vixsrc.to/movie/{id}", tvUrl: "https://vixsrc.to/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidfast", label: "VidFast", sub: "Server Golf", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 6,
    movieUrl: "https://vidfast.pro/movie/{id}", tvUrl: "https://vidfast.pro/tv/{id}/{season}/{episode}"
  },
  {
    key: "toustream", label: "TouStream", sub: "Server Hotel", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 7,
    movieUrl: "https://toustream.xyz/tou/movie/{id}", tvUrl: "https://toustream.xyz/tou/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidzee", label: "VidZee", sub: "Server India", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 8,
    movieUrl: "https://player.vidzee.wtf/embed/movie/{id}", tvUrl: "https://player.vidzee.wtf/embed/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidsrc", label: "VidSrc", sub: "Server Juliett", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 9,
    movieUrl: "https://vidsrc.cc/v2/embed/movie/{id}", tvUrl: "https://vidsrc.cc/v2/embed/tv/{id}/{season}/{episode}"
  },
  {
    key: "vidnest", label: "VidNest", sub: "Server Kilo", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 10,
    movieUrl: "https://vidnest.fun/movie/{id}", tvUrl: "https://vidnest.fun/tv/{id}/{season}/{episode}"
  },
  {
    key: "thisiscinema", label: "ThisIsCinema", sub: "Server Lima", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 11,
    movieUrl: "https://thisiscinema.pages.dev/?version=v5&type=movie&id={id}", tvUrl: "https://thisiscinema.pages.dev/?version=v5&type=tv&id={id}&season={season}&episode={episode}"
  },
  {
    key: "primewire", label: "PrimeWire", sub: "Server Mike", sandboxEnabled: false, enabled: true, isDefault: false, sortOrder: 12,
    movieUrl: "https://primewire.mov/embed/movie?tmdb={id}", tvUrl: "https://primewire.mov/embed/tv?tmdb={id}&season={season}&episode={episode}"
  },
];
