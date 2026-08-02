/**
 * Replaces a curated set of Indian stations in the `indian` category.
 *
 * Any existing row with one of these stream URLs is removed first — wherever it
 * lives — so re-running this never leaves a stale name or a duplicate behind.
 *
 * Run with:  npm run radio:seed:indian
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

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

const CATEGORY_SLUG = "indian";

const STATIONS: { name: string; url: string }[] = [
  { name: "92.7 BIG FM", url: "https://stream.zeno.fm/dbstwo3dvhhtv" },
  { name: "Radio Retro Bollywood - Retro Bollywood 90's", url: "https://stream.zeno.fm/fdgs82xkzhhvv" },
  { name: "V V Radio", url: "https://player.vvradio.co.in/proxy/vvradio/stream" },
  { name: "Namm Radio - America's Radio Stream", url: "http://stream.zeno.fm/zhfktkwb0ueuv" },
  { name: "Power FM Kannada", url: "https://stream.zeno.fm/rketbsyc5uhvv" },
  { name: "Radio Active CR", url: "https://stream.zeno.fm/xwhhyc5nyk8uv" },
  { name: "Indigo 91.9 FM", url: "https://a5.asurahosting.com:8600/radio.mp3" },
  { name: "Namm Radio", url: "http://stream.zeno.fm/6quh1pfnt1duv" },
  {
    name: "ಸುಳಾದಿ ಮಂಟಪ (Suladi Mantapa Radio)",
    url: "https://suladimantapa.com/listen/radio_suladimantapa/radio.mp3",
  },
  { name: "Madhur Tarang", url: "https://artemis.streamerr.co/listen/madhur_tarang/radio.mp3" },
  { name: "ShalomBeats Radio - Kannada", url: "http://rd.shalombeatsradio.com:8090/stream" },
  { name: "Radio Girmit", url: "https://stream.radiojar.com/g6dgm6m6p3hvv" },
  { name: "ShalomBeats Radio - Telugu", url: "http://rd.shalombeatsradio.com:9190/stream/;" },
  { name: "ShalomBeats Radio - Hindi", url: "http://rd.shalombeatsradio.com:7090/stream/;" },
  { name: "Radio AmchiKONKANI", url: "http://178.32.107.151:3711/stream" },
  { name: "ShalomBeats Radio - Instrumental", url: "http://rd.shalombeatsradio.com:8010/stream.mp3" },
  {
    name: "Theophony FM - CHRISTIAN RADIO STATION",
    url: "https://mediatechnica.com:2020/stream/theophonyenglishaac",
  },
  { name: "ShalomBeats Radio - Malayalam", url: "http://rd.shalombeatsradio.com:8006/stream/;" },
  { name: "ShalomBeats Radio - Tamil", url: "http://rd.shalombeatsradio.com:6090/stream/;" },
  { name: "Theophony Tamil Radio", url: "https://mediatechnica.com:8002/theophony_tamil.mp3" },
  { name: "ShalomBeats Radio - English", url: "http://rd.shalombeatsradio.com:8190/stream/;" },
  {
    name: "Theophony - English Christian Radio",
    url: "https://mediatechnica.com:8000/theophony_english.mp3",
  },
  { name: "Spooler Pod", url: "http://65.108.98.93:7747/stream/;" },
  { name: "DollarFM", url: "https://stream.zeno.fm/06b4pm7pyd0uv" },
  { name: "Feba Online", url: "https://www.radioking.com/play/feba-online/618317" },
  { name: "Lifelight Radio", url: "http://chandra.shoutca.st:8143/;" },
  { name: "Periyava Vanoli", url: "https://stream.zeno.fm/35dqa47urg0uv" },
];

async function main() {
  const urls = STATIONS.map((s) => s.url);
  const unique = new Set(urls);
  if (unique.size !== urls.length) {
    throw new Error(`Duplicate URLs in the source list (${urls.length - unique.size})`);
  }

  const category = await pool.query<{ id: string }>(
    `select id from "RadioCategory" where slug = $1`,
    [CATEGORY_SLUG]
  );
  if (category.rowCount === 0) {
    throw new Error(`Category "${CATEGORY_SLUG}" not found — run npm run radio:seed first`);
  }
  const categoryId = category.rows[0].id;

  /* 1. Show exactly what is about to be removed, and from where. */
  const existing = await pool.query<{ name: string; url: string; slug: string }>(
    `select s.name, s.url, c.slug
       from "RadioStation" s
       join "RadioCategory" c on c.id = s."categoryId"
      where s.url = any($1::text[])
      order by c.slug, s.name`,
    [urls]
  );

  if (existing.rowCount === 0) {
    console.log("No existing rows match these URLs.");
  } else {
    console.log(`Removing ${existing.rowCount} existing row(s):`);
    for (const r of existing.rows) console.log(`  [${r.slug}] ${r.name}`);
  }

  const deleted = await pool.query(`delete from "RadioStation" where url = any($1::text[])`, [urls]);
  console.log(`Deleted ${deleted.rowCount} row(s).\n`);

  /* 2. Insert the curated list. */
  let inserted = 0;
  for (const station of STATIONS) {
    const res = await pool.query(
      `insert into "RadioStation" (id, name, url, "categoryId", "createdAt", "updatedAt")
       values (gen_random_uuid()::text, $1, $2, $3, now(), now())
       on conflict ("categoryId", url) do nothing`,
      [station.name, station.url, categoryId]
    );
    inserted += res.rowCount ?? 0;
  }
  console.log(`Inserted ${inserted}/${STATIONS.length} station(s) into "${CATEGORY_SLUG}".`);

  const total = await pool.query<{ n: number }>(
    `select count(*)::int n from "RadioStation" where "categoryId" = $1`,
    [categoryId]
  );
  console.log(`"${CATEGORY_SLUG}" now holds ${total.rows[0].n} stations.`);
}

main()
  .catch((e) => {
    console.error("\nIndian station seeding failed:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
