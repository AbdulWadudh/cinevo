import type { MetadataRoute } from "next";
import { site } from "@/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.name,
    description: site.description.short,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    icons: [
      { src: site.logo.mark, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: site.logo.mark, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: site.logo.mark, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
