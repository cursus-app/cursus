-- Add MONTHLY_OBJECTIVE_MET to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MONTHLY_OBJECTIVE_MET';

-- Partial index on submissions where xp_awarded_at IS NULL (frequent read path)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_xp_awarded_at_null_idx"
  ON "submissions" ("id")
  WHERE "xp_awarded_at" IS NULL;
