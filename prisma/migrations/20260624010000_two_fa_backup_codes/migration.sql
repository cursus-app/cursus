-- Migration ST-02.5 — 2FA TOTP backup codes
-- La table stocke des codes de backup hashés (SHA-256) à usage unique.
-- RLS activée : chaque utilisateur ne voit QUE ses propres codes.

CREATE TABLE "two_fa_backup_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_fa_backup_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "two_fa_backup_codes_user_id_idx" ON "two_fa_backup_codes"("user_id");

ALTER TABLE "two_fa_backup_codes" ADD CONSTRAINT "two_fa_backup_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS : chaque utilisateur accède uniquement à ses propres codes de backup.
ALTER TABLE "two_fa_backup_codes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "two_fa_backup_codes_own" ON "two_fa_backup_codes"
  FOR ALL USING (user_id = auth.uid());
