import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour la gestion des cohortes.
 * Cf. ST-04.1 — CRUD cohorte avec cycle de vie.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const cohorteRhythmEnum = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']);
export const cohorteStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);

/**
 * Base schema without the cross-field refinement.
 * Used to derive partial schemas for updates.
 */
const cohorteBaseSchema = z.object({
  name: z.string().min(2, 'cohortes.errors.nameTooShort').max(100, 'cohortes.errors.nameTooLong'),
  cursusId: z.string().uuid('cohortes.errors.cursusIdInvalid'),
  startDate: z.string().regex(DATE_REGEX, 'cohortes.errors.startDateInvalid'),
  endDate: z.string().regex(DATE_REGEX, 'cohortes.errors.endDateInvalid'),
  rhythm: cohorteRhythmEnum.default('WEEKLY'),
});

export const cohorteCreateSchema = cohorteBaseSchema.refine((d) => d.endDate > d.startDate, {
  message: 'cohortes.errors.endDateBeforeStart',
  path: ['endDate'],
});

export const cohorteUpdateSchema = cohorteBaseSchema
  .omit({ cursusId: true })
  .partial()
  .refine(
    (d) => {
      if (d.startDate !== undefined && d.endDate !== undefined) {
        return d.endDate > d.startDate;
      }
      return true;
    },
    {
      message: 'cohortes.errors.endDateBeforeStart',
      path: ['endDate'],
    },
  );

export const listCohortesQuerySchema = z.object({
  status: cohorteStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CohorteCreateInput = z.infer<typeof cohorteCreateSchema>;
export type CohorteUpdateInput = z.infer<typeof cohorteUpdateSchema>;
export type ListCohortesQuery = z.infer<typeof listCohortesQuerySchema>;
