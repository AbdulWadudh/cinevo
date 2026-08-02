-- Radio: playlist categories from the m3u-rest-api index plus their cached stations.
--
-- The radio tables were originally created with `prisma db push` and never
-- captured as a migration, so this file is written to be idempotent: it
-- baselines a fresh database and brings an already-pushed one up to date.

-- 1. Base tables.
CREATE TABLE IF NOT EXISTS "RadioCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RadioCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RadioStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RadioStation_pkey" PRIMARY KEY ("id")
);

-- 2. Columns added after the initial push.
ALTER TABLE "RadioCategory" ADD COLUMN IF NOT EXISTS "group" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "RadioCategory" ADD COLUMN IF NOT EXISTS "hydratedAt" TIMESTAMP(3);

-- 3. Categories seeded before this migration already have their stations
--    cached, so backfill the marker rather than re-fetching them upstream.
UPDATE "RadioCategory" c
SET "hydratedAt" = CURRENT_TIMESTAMP
WHERE c."hydratedAt" IS NULL
  AND EXISTS (SELECT 1 FROM "RadioStation" s WHERE s."categoryId" = c."id");

-- 4. Drop duplicate (categoryId, url) rows before the unique index is added.
--    Earlier seeds inserted straight from upstream, which repeats stream URLs.
DELETE FROM "RadioStation" a
USING "RadioStation" b
WHERE a."categoryId" = b."categoryId"
  AND a."url" = b."url"
  AND a."id" > b."id";

-- 5. Indexes and constraints.
CREATE UNIQUE INDEX IF NOT EXISTS "RadioCategory_slug_key" ON "RadioCategory"("slug");
CREATE INDEX IF NOT EXISTS "RadioCategory_group_idx" ON "RadioCategory"("group");
CREATE INDEX IF NOT EXISTS "RadioCategory_hydratedAt_idx" ON "RadioCategory"("hydratedAt");
CREATE INDEX IF NOT EXISTS "RadioStation_categoryId_idx" ON "RadioStation"("categoryId");
CREATE INDEX IF NOT EXISTS "RadioStation_name_idx" ON "RadioStation"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "RadioStation_categoryId_url_key" ON "RadioStation"("categoryId", "url");

DO $$
BEGIN
    ALTER TABLE "RadioStation"
        ADD CONSTRAINT "RadioStation_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "RadioCategory"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
