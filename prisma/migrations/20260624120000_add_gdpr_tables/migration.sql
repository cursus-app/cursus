-- Migration: add_gdpr_tables
-- ST-15.1 (export données personnelles) + ST-15.2 (droit à l'oubli)
-- Ajoute :
--   - enum AccountStatus (ACTIVE, PENDING_DELETION, SUSPENDED)
--   - enum GdprExportStatus (PENDING, PROCESSING, COMPLETED, FAILED)
--   - colonnes RGPD sur users (account_status, deletion_scheduled_at, gdpr_export_requested_at, …)
--   - table gdpr_export_jobs

-- --------------------------------
-- Enums
-- --------------------------------
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING_DELETION', 'SUSPENDED');
CREATE TYPE "GdprExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- --------------------------------
-- Nouvelles colonnes sur users
-- --------------------------------
ALTER TABLE "users"
  ADD COLUMN "account_status"          "AccountStatus"  NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "deletion_scheduled_at"   TIMESTAMPTZ,
  ADD COLUMN "deletion_cancel_token"   TEXT,
  ADD COLUMN "gdpr_export_requested_at" TIMESTAMPTZ;

-- Index pour filtrer les comptes en attente de suppression
CREATE INDEX "users_account_status_idx" ON "users" ("account_status");

-- --------------------------------
-- Table gdpr_export_jobs
-- --------------------------------
CREATE TABLE "gdpr_export_jobs" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      UUID         NOT NULL,
  "status"       "GdprExportStatus" NOT NULL DEFAULT 'PENDING',
  "file_path"    TEXT,
  "expires_at"   TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ,

  CONSTRAINT "gdpr_export_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gdpr_export_jobs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "gdpr_export_jobs_user_id_idx"  ON "gdpr_export_jobs" ("user_id");
CREATE INDEX "gdpr_export_jobs_status_idx"   ON "gdpr_export_jobs" ("status");
CREATE INDEX "gdpr_export_jobs_created_at_idx" ON "gdpr_export_jobs" ("created_at");
