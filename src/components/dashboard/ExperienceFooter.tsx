"use client";

import Link from "next/link";
import { site } from "@/config";
import ExperienceBrand from "@/components/theme/ExperienceBrand";
import { getExperience } from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";

/** The same Cinevo destinations in every experience — only the layout differs. */
const SITE_COLUMNS = [
  [
    ["Browse", "/browse"],
    ["Gallery", "/gallery"],
    ["Mystery", "/reveal"],
  ],
  [
    ["Radio", "/radio"],
    ["Wishlist", "/wishlist"],
    ["History", "/history"],
  ],
  [
    ["Search", "/search"],
    ["Profile", "/profile"],
    ["Top 10", "/browse"],
  ],
  [
    ["Home", "/"],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ],
] as const;

const SITE_LINKS = [
  ["Browse", "/browse"],
  ["Gallery", "/gallery"],
  ["Radio", "/radio"],
  ["Wishlist", "/wishlist"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export default function ExperienceFooter() {
  const { experience } = useTheme();
  const active = getExperience(experience);

  if (active.id === "netflix") {
    return (
      <footer className="xp-footer xp-footer-netflix px-6 pb-10 pt-8 md:px-12">
        <div className="mx-auto max-w-6xl text-[#b3b3b3]">
          <p className="mb-6 text-sm">Explore {site.name}.</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
            {SITE_COLUMNS.flat().map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="underline decoration-transparent transition-colors hover:text-white hover:decoration-white/40"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-7 opacity-60">
            <ExperienceBrand className="h-6 w-auto" />
          </div>
          <p className="mt-3 text-[10px] text-[#808080]">{site.copyright}</p>
        </div>
      </footer>
    );
  }

  if (active.id === "disney-hotstar") {
    return (
      <footer className="xp-footer xp-footer-disney px-6 pb-10 pt-10 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
          <ExperienceBrand className="h-7 w-auto opacity-90" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/55">
            {SITE_LINKS.map(([label, href]) => (
              <Link key={label} href={href} className="transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-white/35">{site.copyright}</p>
        </div>
      </footer>
    );
  }

  if (active.id === "apple-tv") {
    return (
      <footer className="xp-footer xp-footer-apple px-6 pb-12 pt-12 md:px-12">
        <div className="mx-auto max-w-6xl border-t border-white/10 pt-6 text-[11px] text-white/45">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SITE_LINKS.map(([label, href]) => (
              <Link key={label} href={href} className="transition-colors hover:text-white/80">
                {label}
              </Link>
            ))}
          </div>
          <p className="mt-4">{site.copyright}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-12 border-t border-border px-6 py-5 md:px-12">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted">{site.copyright}</span>
          <Link href="/privacy" className="text-[11px] text-muted transition-colors hover:text-fg-secondary">
            Privacy
          </Link>
          <Link href="/terms" className="text-[11px] text-muted transition-colors hover:text-fg-secondary">
            Terms
          </Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static logo, variable width */}
        <img src={site.logo.full} alt={site.name} className="h-6 w-auto opacity-90" />
      </div>
    </footer>
  );
}
