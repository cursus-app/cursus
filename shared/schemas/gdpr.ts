// Schémas Zod partagés client/serveur pour les endpoints RGPD.
// Utilisés dans les endpoints API (validation body) et les formulaires Vue (toTypedSchema).
import { z } from 'zod';

// ---- ST-15.1 : Export données personnelles ----

/**
 * Body de POST /api/me/export
 * Pas de body requis : l'action est déclenchée par l'utilisateur authentifié.
 * Le schéma est volontairement vide (on valide juste que le body ne contient
 * rien de dangereux via le schema strict).
 */
export const GdprExportRequestSchema = z.object({}).strict();

export type GdprExportRequest = z.infer<typeof GdprExportRequestSchema>;

// ---- ST-15.2 : Droit à l'oubli ----

/** Phrase de confirmation exacte attendue par l'endpoint de suppression. */
export const DELETION_CONFIRMATION_PHRASE = 'SUPPRIMER MON COMPTE' as const;

/**
 * Body de POST /api/me/delete
 * L'utilisateur doit saisir la phrase exacte pour confirmer.
 */
export const GdprDeleteRequestSchema = z.object({
  confirmation: z.literal(DELETION_CONFIRMATION_PHRASE, {
    errorMap: () => ({
      message: `Vous devez saisir exactement "${DELETION_CONFIRMATION_PHRASE}" pour confirmer.`,
    }),
  }),
});

export type GdprDeleteRequest = z.infer<typeof GdprDeleteRequestSchema>;

// ---- Réponses API ----

export const GdprQueuedResponseSchema = z.object({
  queued: z.literal(true),
  message: z.string(),
});

export type GdprQueuedResponse = z.infer<typeof GdprQueuedResponseSchema>;
