-- Migration: add module_ids to memberships (ST-04.3)
-- Pour les co-formateurs : null = accès global, array de UUIDs = accès limité.
ALTER TABLE "memberships" ADD COLUMN "module_ids" JSONB;
