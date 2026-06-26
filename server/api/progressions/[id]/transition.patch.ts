/**
 * PATCH /api/progressions/:id/transition
 *
 * Applique une transition de statut sur une Progression.
 *
 * Auth : requis.
 * Autorisations :
 *  - Stagiaire peut transitionner SA propre progression (sauf VALIDE_OVERRIDE).
 *  - Formateur (FORMATEUR_PRINCIPAL / CO_FORMATEUR) peut transitionner n'importe
 *    quelle progression de ses cohortes ET déclencher VALIDE_OVERRIDE.
 *  - Admin : tous droits.
 *
 * Body : { to: ProgressionStatus, reason?: string }
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import {
  transition,
  InvalidTransitionError,
} from '~~/server/utils/progressionStateMachine';
import type { ProgressionStatus } from '@prisma/client';

const PROGRESSION_STATUS_VALUES = [
  'A_VENIR',
  'EN_COURS',
  'SOUMIS',
  'VALIDE',
  'BLOQUE',
  'EN_ALERTE',
  'EN_RETARD',
  'VALIDE_OVERRIDE',
] as const satisfies ProgressionStatus[];

const TransitionBodySchema = z.object({
  to: z.enum(PROGRESSION_STATUS_VALUES, {
    errorMap: () => ({ message: 'progressions.errors.invalidStatus' }),
  }),
  reason: z.string().max(1000).optional(),
});

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing progression id' });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`progressions:transition:${supabaseUser['id']}`, 30, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ── Body validation ────────────────────────────────────────────────────────
  const body = await readValidatedBody(event, (raw) =>
    TransitionBodySchema.safeParse(raw),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: 'progressions.errors.invalidBody',
      data: body.error.flatten(),
    });
  }

  const { to, reason } = body.data;

  // ── Charger la progression ─────────────────────────────────────────────────
  const progression = await prisma.progression.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      cohortModule: {
        select: {
          cohorteId: true,
        },
      },
    },
  });

  if (!progression) {
    throw createError({ statusCode: 404, message: 'progressions.errors.notFound' });
  }

  // ── Autorisation ───────────────────────────────────────────────────────────
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isOwner = dbUser.id === progression.userId;

  // Check if user has a formateur role globally
  const hasFormateurRole =
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' || dbUser.globalRole === 'CO_FORMATEUR';

  // Scope formateur access to their assigned cohort only (prevent IDOR)
  let isFormateurInCohort = false;
  if (hasFormateurRole && !isAdmin) {
    const membership = await prisma.membership.findFirst({
      where: {
        cohorteId: progression.cohortModule.cohorteId,
        userId: dbUser.id,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
    });
    if (!membership) {
      logger.warn(
        { progressionId: id, userIdHash: hashId(dbUser.id) },
        'progressions.transition.formateur_not_in_cohort',
      );
      throw createError({ statusCode: 403, message: 'progressions.errors.forbidden' });
    }
    isFormateurInCohort = true;
  }

  if (!isAdmin && !isFormateurInCohort && !isOwner) {
    logger.warn(
      { progressionId: id, userIdHash: hashId(dbUser.id) },
      'progressions.transition.forbidden',
    );
    throw createError({ statusCode: 403, message: 'progressions.errors.forbidden' });
  }

  // Seuls les formateurs/admins de la cohorte peuvent déclencher VALIDE_OVERRIDE
  if (to === 'VALIDE_OVERRIDE' && !isAdmin && !isFormateurInCohort) {
    logger.warn(
      { progressionId: id, userIdHash: hashId(dbUser.id), to },
      'progressions.transition.override_forbidden',
    );
    throw createError({
      statusCode: 403,
      message: 'progressions.errors.overrideForbidden',
    });
  }

  // ── Exécuter la transition ─────────────────────────────────────────────────
  try {
    const updated = await transition(
      prisma,
      id,
      progression.status,
      to,
      reason,
      dbUser.id,
    );

    return updated;
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw createError({
        statusCode: 422,
        message: err.message,
        data: { from: err.from, to: err.to },
      });
    }

    // Race condition ou état incohérent
    logger.error(
      { progressionId: id, from: progression.status, to, err },
      'progressions.transition.error',
    );
    throw createError({ statusCode: 500, message: 'progressions.errors.transitionFailed' });
  }
});
