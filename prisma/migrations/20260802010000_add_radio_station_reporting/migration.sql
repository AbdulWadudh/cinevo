-- Listener reporting for dead radio streams, plus admin moderation fields.

ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "reportCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "isBroken" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "RadioStation_isBroken_idx" ON "RadioStation"("isBroken");
