import Link from "next/link";

/**
 * Disney+ Hotstar's brand row. The tiles are typographic homages, not the
 * studios' logo artwork: each one opens the catalogue filtered to that studio.
 */
const BRANDS = [
  { name: "Disney", mark: "Disney", slug: "disney", company: "2" },
  { name: "Pixar", mark: "PIXAR", slug: "pixar", company: "3" },
  { name: "Marvel", mark: "MARVEL", slug: "marvel", company: "420" },
  { name: "Star Wars", mark: "STAR WARS", slug: "star-wars", company: "1" },
  {
    name: "National Geographic",
    mark: "NATIONAL GEOGRAPHIC",
    slug: "natgeo",
    company: "7521",
  },
];

export default function BrandRail() {
  return (
    <section
      id="brands"
      aria-label="Explore by brand"
      className="xp-disney-only px-6 md:px-12 mb-10 scroll-mt-24"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BRANDS.map((brand) => (
          <Link
            key={brand.slug}
            href={`/?company=${brand.company}&companyName=${encodeURIComponent(brand.name)}`}
            className={`xp-brand-tile xp-brand-${brand.slug}`}
            aria-label={`Browse ${brand.name}`}
          >
            <span className="xp-brand-glow" aria-hidden="true" />
            <span className="xp-brand-mark">{brand.mark}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
