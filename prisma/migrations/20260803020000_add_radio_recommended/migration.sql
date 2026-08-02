-- Hand-picked stations for the "Recommended" rail on the radio page.
-- `recommendedOrder` sets the running order; NULLs sort last.

ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "recommendedOrder" INTEGER;

CREATE INDEX IF NOT EXISTS "RadioStation_isRecommended_idx" ON "RadioStation"("isRecommended");
