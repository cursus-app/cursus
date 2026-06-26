-- Migration: add title and body to notifications, make payloadJson optional (ST-12.1)
-- title : libellé principal visible dans la cloche.
-- body  : texte de détail optionnel.
-- payloadJson passe de NOT NULL à nullable (pour les nouvelles notifs sans payload custom).

ALTER TABLE "notifications"
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "body"  TEXT;

-- Supprimer la contrainte NOT NULL du payload (désormais optionnel)
ALTER TABLE "notifications"
  ALTER COLUMN "payload_json" DROP NOT NULL;

-- Retirer le DEFAULT vide sur title après le backfill (colonnes existantes = '').
ALTER TABLE "notifications"
  ALTER COLUMN "title" DROP DEFAULT;
