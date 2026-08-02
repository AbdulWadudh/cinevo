-- Admin kill switch for individual radio stations. Disabled stations remain in
-- the catalogue (so a re-seed doesn't resurrect them silently) but are filtered
-- out of every listener-facing query.

ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "RadioStation_isActive_idx" ON "RadioStation"("isActive");
