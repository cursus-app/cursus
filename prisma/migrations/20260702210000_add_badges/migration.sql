-- ST-11.2 — Système badges : Attribution manuelle
-- Migration NON DESTRUCTIVE : ajout de colonnes uniquement.
-- Les tables badges et user_badges existent déjà depuis la migration initiale.
-- On ajoute uniquement les champs nécessaires à l'attribution manuelle (formateur).

-- granted_by : UUID du formateur qui a attribué manuellement (null = attribution auto)
ALTER TABLE "user_badges" ADD COLUMN IF NOT EXISTS "granted_by" UUID;

-- mention : texte optionnel saisi par le formateur lors d'une attribution manuelle
ALTER TABLE "user_badges" ADD COLUMN IF NOT EXISTS "mention" TEXT;
