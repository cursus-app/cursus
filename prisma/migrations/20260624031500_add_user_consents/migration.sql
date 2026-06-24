-- ST-15.3 : Table user_consents
-- Trace chaque acceptation de document légal (CGU, politique de confidentialité).
-- Base légale : conservation des preuves de consentement RGPD (5 ans recommandés).
--
-- Remarques de conception :
--   - `id` en CUID (string) : cohérent avec le modèle Prisma (@id @default(cuid()))
--   - `document_type` : 'cgu' | 'privacy' (validé côté applicatif via Zod)
--   - `document_version` : semver string ex. '1.0.0'
--   - `ip_address` : pseudonymisée (hashée SHA-256) côté applicatif avant insertion
--   - PAS de FK vers users : la table users a un deletedAt (soft delete). Le
--     consentement doit survivre à la suppression du compte pour audit RGPD.
--     On conserve le userId comme string sans contrainte FK intentionnellement.
--   - index composite (user_id, document_type) : requête fréquente "quel est le
--     dernier consentement de l'user X pour le type Y ?"

CREATE TABLE "user_consents" (
    "id"               TEXT         NOT NULL,
    "user_id"          TEXT         NOT NULL,
    "document_type"    TEXT         NOT NULL,
    "document_version" TEXT         NOT NULL,
    "accepted_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address"       TEXT,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- Index composite pour les lookups fréquents
CREATE INDEX "user_consents_user_id_document_type_idx" ON "user_consents"("user_id", "document_type");
