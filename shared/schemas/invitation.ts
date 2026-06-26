import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour les invitations de stagiaires.
 * Cf. ST-04.2 — Invitation stagiaires (single + bulk CSV).
 */

/** Schéma pour l'invitation en batch (1 à 50 emails). */
export const inviteBatchSchema = z.object({
  emails: z
    .array(z.string().email('invitations.errors.emailInvalid'))
    .min(1, 'invitations.errors.emailRequired')
    .max(50, 'invitations.errors.tooManyEmails'),
});

export type InviteBatchInput = z.infer<typeof inviteBatchSchema>;

/** Résultat d'un batch d'invitations retourné par l'API. */
export interface InvitationBatchResult {
  invited: string[];
  deduplicated: string[];
  total: number;
}

/** Type d'une invitation telle que retournée par l'API de liste. */
export interface InvitationItem {
  id: string;
  email: string;
  role: string;
  cohorteId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
