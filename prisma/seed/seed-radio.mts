/**
 * Seeds the radio catalogue from the m3u-rest-api index.
 *
 * Imports all ~4,684 playlists as categories, then pre-warms the stations for
 * the featured set. Every other category hydrates on first visit (see
 * `hydrateCategory` in src/app/actions/radio.ts), which is why this doesn't
 * try to pull all ~1.1M upstream station entries.
 *
 * Run with:  npm run radio:seed
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { classifySlug, prettifyName, FEATURED_SLUGS } from "../../src/lib/radio/categories.ts";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    process.env[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const INDEX_URL = "https://junguler.github.io/m3u-rest-api/api";
const BASE_URL = "https://junguler.github.io/m3u-rest-api/";
const MAX_STATIONS_PER_CATEGORY = 400;

interface IndexPlaylist {
  name: string;
  url: string;
  count: number;
}

async function main() {
  console.log("Seeding radio catalogue…\n");

  /* 1. Index → categories. */
  console.log(`Fetching index: ${INDEX_URL}`);
  const res = await fetch(INDEX_URL);
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { playlists?: IndexPlaylist[] };
  const playlists = json.playlists ?? [];
  console.log(`  ${playlists.length} playlists found\n`);

  const bySlug = new Map<string, { name: string; slug: string; url: string; count: number; group: string }>();
  for (const p of playlists) {
    const slug = (p.name ?? "").toLowerCase().trim();
    if (!slug) continue;
    bySlug.set(slug, {
      slug,
      name: prettifyName(slug),
      url: new URL(p.url, BASE_URL).toString(),
      count: p.count ?? 0,
      group: classifySlug(slug),
    });
  }
  const categories = [...bySlug.values()];

  // Upsert rather than delete-then-insert: wiping the table would cascade away
  // every cached station and force a full re-hydration.
  console.log(`Upserting ${categories.length} categories…`);
  let created = 0;
  for (let i = 0; i < categories.length; i += 200) {
    const chunk = categories.slice(i, i + 200);
    await Promise.all(
      chunk.map((c) =>
        prisma.radioCategory.upsert({
          where: { slug: c.slug },
          create: { name: c.name, slug: c.slug, url: c.url, count: c.count, group: c.group },
          update: { name: c.name, url: c.url, count: c.count, group: c.group },
        })
      )
    );
    created += chunk.length;
    process.stdout.write(`\r  ${created}/${categories.length}`);
  }
  console.log("\n  ✓ categories up to date\n");

  /* 2. Pre-warm the featured categories so the landing page is instant. */
  console.log(`Pre-warming ${FEATURED_SLUGS.length} featured categories…`);

  for (const slug of FEATURED_SLUGS) {
    const category = await prisma.radioCategory.findUnique({
      where: { slug },
      select: { id: true, url: true },
    });

    if (!category) {
      // Guards the class of bug that left "hip-hop" unseeded: the index uses
      // underscores, so a hyphenated slug silently matched nothing.
      console.warn(`  ! ${slug}: not present in the index — check the slug spelling`);
      continue;
    }

    try {
      const catRes = await fetch(category.url, { headers: { "User-Agent": "Cinevo/1.0" } });
      if (!catRes.ok) {
        console.warn(`  ! ${slug}: upstream ${catRes.status}`);
        continue;
      }

      const catJson = (await catRes.json()) as { items?: { name?: string; url?: string }[] };
      const seen = new Set<string>();
      const rows: { name: string; url: string; categoryId: string }[] = [];

      for (const item of catJson.items ?? []) {
        const url = item.url?.trim();
        if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        rows.push({ name: item.name?.trim() || "Unknown Station", url, categoryId: category.id });
        if (rows.length >= MAX_STATIONS_PER_CATEGORY) break;
      }

      const result = await prisma.radioStation.createMany({ data: rows, skipDuplicates: true });
      await prisma.radioCategory.update({
        where: { id: category.id },
        data: { hydratedAt: new Date() },
      });

      console.log(`  ✓ ${slug.padEnd(12)} ${rows.length} stations (${result.count} new)`);
    } catch (err) {
      console.error(`  ! ${slug}:`, err instanceof Error ? err.message : err);
    }
  }

  const [catCount, stationCount] = await Promise.all([
    prisma.radioCategory.count(),
    prisma.radioStation.count(),
  ]);
  console.log(`\nDone — ${catCount} categories, ${stationCount} stations cached.`);
}

main()
  .catch((e) => {
    console.error("\nRadio seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
