import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour la gestion du profil utilisateur.
 * Cf. ST-02.6 — PATCH /api/profile, POST /api/profile/delete.
 *
 * Les messages sont des clés i18n : traduits côté client, renvoyés tels quels
 * côté serveur (le client les traduit à la réception).
 */

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'profile.errors.fullNameRequired')
    .max(100, 'profile.errors.fullNameTooLong')
    .optional(),
  bio: z.string().max(500, 'profile.errors.bioTooLong').optional(),
  locale: z.enum(['fr', 'en']).optional(),
  timezone: z.string().max(50, 'profile.errors.timezoneTooLong').optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z
    .string()
    .min(3, 'profile.errors.slugTooShort')
    .max(50, 'profile.errors.slugTooLong')
    .regex(/^[a-z0-9-]+$/, 'profile.errors.slugInvalidChars')
    .optional()
    .nullable(),
});

export const deleteAccountSchema = z.object({
  email: z.string().email('profile.errors.emailInvalid'),
  password: z.string().min(1, 'profile.errors.passwordRequired'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
