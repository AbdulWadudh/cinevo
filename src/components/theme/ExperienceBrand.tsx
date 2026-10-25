"use client";

import { site } from "@/config";

/**
 * The site's own brand is the only mark shown. An experience changes layout,
 * type and motion — it never puts another service's name on Cinevo.
 */
export default function ExperienceBrand({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static logo, variable width
    <img src={site.logo.full} alt={site.name} className={className} />
  );
}
