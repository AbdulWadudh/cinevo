import React from "react";
import Image from "next/image";
import { MonitorPlay } from "lucide-react";
import type { TMDBWatchProviders, TMDBProvider, TMDBProviderRegion } from "@/lib/tmdb";

// Region preference order — picks the first that has data, else any available.
const PREFERRED_REGIONS = ["IN", "US", "GB", "CA", "AU"];

const REGION_NAMES: Record<string, string> = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
};

function pickRegion(results: Record<string, TMDBProviderRegion>): { code: string; data: TMDBProviderRegion } | null {
  const codes = Object.keys(results);
  if (codes.length === 0) return null;
  const code = PREFERRED_REGIONS.find((r) => results[r]) ?? codes[0];
  return { code, data: results[code] };
}

function ProviderRow({ label, providers }: { label: string; providers?: TMDBProvider[] }) {
  if (!providers || providers.length === 0) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted w-12 flex-none pt-2.5">{label}</span>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <div
            key={p.provider_id}
            title={p.provider_name}
            className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] bg-surface-hover"
          >
            {p.logo_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                alt={p.provider_name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-[9px] text-muted text-center px-0.5">{p.provider_name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WatchProviders({
  providers,
  bare = false,
}: {
  providers: TMDBWatchProviders | null;
  bare?: boolean;
}) {
  if (!providers?.results) return null;
  const region = pickRegion(providers.results);
  if (!region) return null;

  const { flatrate, rent, buy, free, ads, link } = region.data;
  const hasAny = [flatrate, free, ads, rent, buy].some((g) => g && g.length > 0);
  if (!hasAny) return null;

  // Bare: every provider on a single line (merged + de-duplicated, no labels).
  if (bare) {
    const seenIds = new Set<number>();
    const all = [...(flatrate ?? []), ...(free ?? []), ...(ads ?? []), ...(rent ?? []), ...(buy ?? [])].filter(
      (p) => (seenIds.has(p.provider_id) ? false : seenIds.add(p.provider_id))
    );
    if (all.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {all.map((p) => (
          <div
            key={p.provider_id}
            title={p.provider_name}
            className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] bg-surface-hover flex-none"
          >
            {p.logo_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                alt={p.provider_name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-[9px] text-muted text-center px-0.5">{p.provider_name}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface/40 border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-fg flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-accent" />
          Where to watch
          <span className="text-[10px] font-semibold text-muted">· {REGION_NAMES[region.code] ?? region.code}</span>
        </h3>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-accent hover:opacity-80 transition-opacity"
          >
            View on JustWatch →
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <ProviderRow label="Stream" providers={flatrate} />
        <ProviderRow label="Free" providers={free} />
        <ProviderRow label="Ads" providers={ads} />
        <ProviderRow label="Rent" providers={rent} />
        <ProviderRow label="Buy" providers={buy} />
      </div>

      <p className="text-[9px] text-muted mt-4">Availability data powered by JustWatch.</p>
    </div>
  );
}
