-- Admin-created radio categories. Marked so they bypass the browsability
-- threshold applied to imported ones — a category added by hand starts with a
-- single station and would otherwise be filtered out of the listener UI.

ALTER TABLE "RadioCategory" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "RadioCategory_isCustom_idx" ON "RadioCategory"("isCustom");
