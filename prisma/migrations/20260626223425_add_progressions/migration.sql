-- CreateEnum
CREATE TYPE "ProgressionStatus" AS ENUM ('A_VENIR', 'EN_COURS', 'SOUMIS', 'VALIDE', 'BLOQUE', 'EN_ALERTE', 'EN_RETARD', 'VALIDE_OVERRIDE');

-- DropForeignKey
ALTER TABLE "gdpr_export_jobs" DROP CONSTRAINT "gdpr_export_jobs_user_id_fkey";

-- AlterTable
ALTER TABLE "gdpr_export_jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "two_fa_backup_codes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "deletion_scheduled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "gdpr_export_requested_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cohort_modules" (
    "id" TEXT NOT NULL,
    "cohorte_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohort_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progressions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "cohort_module_id" TEXT NOT NULL,
    "status" "ProgressionStatus" NOT NULL DEFAULT 'A_VENIR',
    "submitted_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "override_by" UUID,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cohort_modules_cohorte_id_idx" ON "cohort_modules"("cohorte_id");

-- CreateIndex
CREATE INDEX "cohort_modules_module_id_idx" ON "cohort_modules"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_modules_cohorte_id_module_id_key" ON "cohort_modules"("cohorte_id", "module_id");

-- CreateIndex
CREATE INDEX "progressions_user_id_status_idx" ON "progressions"("user_id", "status");

-- CreateIndex
CREATE INDEX "progressions_cohort_module_id_idx" ON "progressions"("cohort_module_id");

-- CreateIndex
CREATE INDEX "progressions_status_idx" ON "progressions"("status");

-- CreateIndex
CREATE INDEX "progressions_due_date_idx" ON "progressions"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "progressions_user_id_cohort_module_id_key" ON "progressions"("user_id", "cohort_module_id");

-- AddForeignKey
ALTER TABLE "cohort_modules" ADD CONSTRAINT "cohort_modules_cohorte_id_fkey" FOREIGN KEY ("cohorte_id") REFERENCES "cohortes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_modules" ADD CONSTRAINT "cohort_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressions" ADD CONSTRAINT "progressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressions" ADD CONSTRAINT "progressions_cohort_module_id_fkey" FOREIGN KEY ("cohort_module_id") REFERENCES "cohort_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_export_jobs" ADD CONSTRAINT "gdpr_export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
