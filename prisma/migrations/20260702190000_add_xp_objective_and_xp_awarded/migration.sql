-- ST-11.1 — Attribution XP automatique
-- Adds xp_objective_monthly to users (nullable — null means no monthly goal set)
-- Adds xp_awarded_at to submissions (idempotency guard — XP awarded once per submission)

ALTER TABLE "users" ADD COLUMN "xp_objective_monthly" INTEGER;

ALTER TABLE "submissions" ADD COLUMN "xp_awarded_at" TIMESTAMP(3);
