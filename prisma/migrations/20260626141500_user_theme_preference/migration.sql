-- Migration ST-18.5 : ajout du champ theme sur la table users.
-- Valeurs acceptées : 'light', 'dark', 'system' (default).
-- La contrainte est applicative (pas de CHECK SQL) pour faciliter l'évolution.

ALTER TABLE "users" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';
