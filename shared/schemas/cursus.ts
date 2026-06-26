import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour la gestion des cursus.
 * Cf. ST-03.1 — CRUD cursus avec brouillon/publié/archivé.
 *
 * Les messages sont des clés i18n : traduits côté client, renvoyés tels quels
 * côté serveur (le client les traduit à la réception).
 */

export const cursusDomainsEnum = z.enum(['dev-web', 'ingenierie-web', 'ia', 'cybersec', 'autre']);

export const cursusLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const cursusStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const createCursusSchema = z.object({
  title: z.string().min(1, 'cursus.errors.titleRequired').max(200, 'cursus.errors.titleTooLong'),
  domain: cursusDomainsEnum,
  level: cursusLevelEnum,
  // z.coerce.number() : fonctionne aussi bien depuis un body JSON (déjà number)
  // que depuis un champ HTML input[type=number] (string → coercé en number).
  durationWeeks: z.coerce
    .number({
      required_error: 'cursus.errors.durationRequired',
      invalid_type_error: 'cursus.errors.durationInvalid',
    })
    .int()
    .min(1, 'cursus.errors.durationInvalid')
    .max(52, 'cursus.errors.durationInvalid'),
  description: z.string().max(5000).optional(),
  prerequisites: z.string().max(3000).optional(),
  slug: z
    .string()
    .min(3, 'cursus.errors.slugInvalid')
    .max(80, 'cursus.errors.slugInvalid')
    .regex(/^[a-z0-9-]+$/, 'cursus.errors.slugInvalid')
    .optional(),
});

export const updateCursusSchema = createCursusSchema.partial();

export const listCursusQuerySchema = z.object({
  status: cursusStatusEnum.optional(),
  domain: cursusDomainsEnum.optional(),
  level: cursusLevelEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCursusInput = z.infer<typeof createCursusSchema>;
export type UpdateCursusInput = z.infer<typeof updateCursusSchema>;
export type ListCursusQuery = z.infer<typeof listCursusQuerySchema>;
