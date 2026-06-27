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

// ─── Co-formateurs ────────────────────────────────────────────────────────────

/**
 * Body de POST /api/cohortes/:id/co-formateurs
 * Ajout d'un co-formateur par email ou userId.
 * moduleIds: null/undefined → accès global, string[] → limité aux modules listés.
 */
export const coFormateurAddSchema = z
  .object({
    email: z.string().email('cohortes.errors.emailInvalid').optional(),
    userId: z.string().uuid('cohortes.errors.userIdInvalid').optional(),
    moduleIds: z.array(z.string().uuid('cohortes.errors.moduleIdInvalid')).nullable().optional(),
  })
  .refine((d) => d.email !== undefined || d.userId !== undefined, {
    message: 'cohortes.errors.emailOrUserIdRequired',
    path: ['email'],
  });

/**
 * Body de PATCH /api/cohortes/:id/co-formateurs/:userId
 * Met à jour les modules assignés.
 * moduleIds: null → global, string[] → accès limité.
 */
export const coFormateurUpdateSchema = z.object({
  moduleIds: z.array(z.string().uuid('cohortes.errors.moduleIdInvalid')).nullable(),
});

export type CoFormateurAddInput = z.infer<typeof coFormateurAddSchema>;
export type CoFormateurUpdateInput = z.infer<typeof coFormateurUpdateSchema>;

// ─── Décalage de planning ──────────────────────────────────────────────────────

/**
 * Body de POST /api/cohortes/:id/shift-schedule
 * days: entier non nul entre -30 et 30
 * reason: raison optionnelle (max 500 char)
 * preview: si true, retourne un aperçu sans appliquer
 * confirmed: requis si days < 0 (décalage en arrière)
 */
export const shiftScheduleBodySchema = z
  .object({
    days: z
      .number({ required_error: 'cohortes.schedule.errors.daysRequired' })
      .int()
      .min(-30, 'cohortes.schedule.errors.daysOutOfRange')
      .max(30, 'cohortes.schedule.errors.daysOutOfRange'),
    reason: z.string().max(500).optional(),
    preview: z.boolean().optional().default(false),
    confirmed: z.boolean().optional().default(false),
  })
  .refine((d) => d.days !== 0, {
    message: 'cohortes.schedule.errors.daysZero',
    path: ['days'],
  });

/** Query pour GET /api/cohortes/:id/shift-schedule?days=N (preview only) */
export const shiftScheduleQuerySchema = z.object({
  days: z.coerce
    .number({ required_error: 'cohortes.schedule.errors.daysRequired' })
    .int()
    .min(-30, 'cohortes.schedule.errors.daysOutOfRange')
    .max(30, 'cohortes.schedule.errors.daysOutOfRange')
    .refine((v) => v !== 0, { message: 'cohortes.schedule.errors.daysZero' }),
});

export type ShiftScheduleBody = z.infer<typeof shiftScheduleBodySchema>;
export type ShiftScheduleQuery = z.infer<typeof shiftScheduleQuerySchema>;
