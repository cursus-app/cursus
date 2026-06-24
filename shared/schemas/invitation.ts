import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour les invitations.
 * Les rôles autorisés via invitation correspondent aux membres d'une cohorte :
 * on ne peut pas inviter un ADMIN via ce flux.
 */
export const createInvitationSchema = z.object({
  email: z.string().email('invitation.errors.emailInvalid'),
  cohorteId: z.string().uuid('invitation.errors.cohorteIdInvalid'),
  role: z.enum(['STAGIAIRE', 'CO_FORMATEUR']).default('STAGIAIRE'),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const acceptInvitationSchema = z.object({
  /**
   * Mot de passe : min 12 chars + majuscule + minuscule + chiffre + symbole.
   * Aligné avec passwordSchema dans shared/schemas/auth.ts.
   */
  password: z
    .string()
    .min(12, 'auth.errors.passwordTooShort')
    .regex(/[A-Z]/, 'auth.errors.passwordNeedsUppercase')
    .regex(/[a-z]/, 'auth.errors.passwordNeedsLowercase')
    .regex(/[0-9]/, 'auth.errors.passwordNeedsDigit')
    .regex(/[^A-Za-z0-9]/, 'auth.errors.passwordNeedsSymbol'),
  fullName: z.string().min(1).max(100).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
