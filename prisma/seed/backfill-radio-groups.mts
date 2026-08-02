/**
 * One-shot maintenance script: applies the radio migration SQL to a database
 * that predates it, then backfills RadioCategory.group from the slug classifier.
 *
 * Run with:  npm run radio:backfill
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { classifySlug } from "../../src/lib/radio/categories.ts";

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

const MIGRATION = path.resolve(
  process.cwd(),
  "prisma/migrations/20260802000000_add_radio_categories_and_stations/migration.sql"
);

async function main() {
  // 1. Apply the migration SQL. Every statement is idempotent, so running this
  //    against an already-migrated database is a no-op.
  console.log("Applying radio migration SQL...");
  await pool.query(fs.readFileSync(MIGRATION, "utf8"));
  console.log("  ✓ schema up to date");

  // 2. Backfill the group column from the classifier.
  const { rows } = await pool.query<{ id: string; slug: string; group: string }>(
    `select id, slug, "group" from "RadioCategory"`
  );
  console.log(`Classifying ${rows.length} categories...`);

  const byGroup = new Map<string, string[]>();
  for (const row of rows) {
    const group = classifySlug(row.slug);
    if (group === row.group) continue;
    const list = byGroup.get(group) ?? [];
    list.push(row.id);
    byGroup.set(group, list);
  }

  if (byGroup.size === 0) {
    console.log("  ✓ all groups already current");
  } else {
    for (const [group, ids] of byGroup) {
      // Chunked so the parameter list stays well inside Postgres' limit.
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        await pool.query(`update "RadioCategory" set "group" = $1 where id = any($2::text[])`, [
          group,
          chunk,
        ]);
      }
      console.log(`  ✓ ${group}: ${ids.length}`);
    }
  }

  const summary = await pool.query<{ group: string; n: number }>(
    `select "group", count(*)::int n from "RadioCategory" group by "group" order by n desc`
  );
  console.log("\nFinal distribution:");
  for (const r of summary.rows) console.log(`  ${r.group.padEnd(10)} ${r.n}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
