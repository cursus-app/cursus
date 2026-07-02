/**
 * POST /api/stagiaires/:id/override — override d'un livrable (validation ou extension).
 *
 * Auth  : FORMATEUR_PRINCIPAL ou CO_FORMATEUR de la cohorteId.
 * RLS   : le stagiaire (:id) doit être STAGIAIRE dans la cohorteId.
 * Audit : chaque override crée une entrée immuable dans audit_logs.
 * RL    : 20 overrides / heure / formateur.
 *
 * Body :
 *   cohorteId    : string (UUID)
 *   submissionId : string (UUID)
 *   action       : 'validate' | 'extend'
 *   reason       : string (min 5 chars)
 *   extendDays   : number (1–30, obligatoire si action === 'extend')
 *
 * Cf. ST-13.3 — TT-13.3.6
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

// ── Schéma Zod ───────────────────────────────────────────────────────────────

const OverrideBodySchema = z
  .object({
    cohorteId: z.string().uuid({ message: 'cohorteId doit être un UUID valide' }),
    submissionId: z.string().uuid({ message: 'submissionId doit être un UUID valide' }),
    action: z.enum(['validate', 'extend']),
    reason: z.string().min(5, { message: 'Le motif doit comporter au moins 5 caractères' }),
    extendDays: z.number().int().min(1).max(30).optional(),
  })
  .refine((data) => data.action !== 'extend' || data.extendDays !== undefined, {
    message: "extendDays est obligatoire pour une extension d'échéance",
    path: ['extendDays'],
  });

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const stagiaireId = getRouterParam(event, 'id');
  if (!stagiaireId) {
    throw createError({ statusCode: 400, message: 'Missing stagiaire id' });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });
  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ── Validation body ───────────────────────────────────────────────────────
  const body = await readValidatedBody(event, (raw) => OverrideBodySchema.safeParse(raw));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: body.error.flatten(),
    });
  }

  const { cohorteId, submissionId, action, reason, extendDays } = body.data;

  // ── Rate limit : 20 overrides / heure / formateur ─────────────────────────
  checkRateLimit(`override:${dbUser.id}`, 20, 60 * 60 * 1_000);

  // ── Vérifier que le caller est formateur de la cohorte ────────────────────
  const isAdmin = dbUser.globalRole === 'ADMIN';
  if (!isAdmin) {
    const callerMembership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        cohorteId,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
      select: { id: true },
    });
    if (!callerMembership) {
      logger.warn(
        { formateurIdHash: hashId(dbUser.id), cohorteId },
        'stagiaire.override.forbidden',
      );
      throw createError({ statusCode: 403, message: 'Forbidden' });
    }
  }

  // ── Vérifier que le stagiaire est dans la cohorte ─────────────────────────
  const stagiaireMembership = await prisma.membership.findFirst({
    where: { userId: stagiaireId, cohorteId, role: 'STAGIAIRE' },
    select: { id: true },
  });
  if (!stagiaireMembership) {
    throw createError({ statusCode: 403, message: 'Stagiaire not in this cohorte' });
  }

  // ── Charger la soumission et vérifier qu'elle appartient au stagiaire ─────
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      moduleId: true,
      status: true,
    },
  });

  if (!submission) {
    throw createError({ statusCode: 404, message: 'Soumission introuvable' });
  }

  if (submission.userId !== stagiaireId) {
    throw createError({
      statusCode: 403,
      message: "Cette soumission n'appartient pas à ce stagiaire",
    });
  }

  const now = new Date();

  if (action === 'validate') {
    // ── Validation manuelle de la soumission ──────────────────────────────
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'VALIDATED_OVERRIDE',
        overriddenById: dbUser.id,
        overrideReason: reason,
        validatedAt: now,
      },
    });
  } else {
    // ── Extension de l'échéance ───────────────────────────────────────────
    // Trouver le CohortModule correspondant au module de cette soumission dans la cohorte
    const cohortModule = await prisma.cohortModule.findUnique({
      where: {
        cohorteId_moduleId: {
          cohorteId,
          moduleId: submission.moduleId,
        },
      },
      select: { id: true },
    });

    if (!cohortModule) {
      throw createError({
        statusCode: 404,
        message: 'Module de la cohorte introuvable pour cette soumission',
      });
    }

    // Trouver la Progression du stagiaire pour ce CohortModule
    const progression = await prisma.progression.findUnique({
      where: {
        userId_cohortModuleId: {
          userId: stagiaireId,
          cohortModuleId: cohortModule.id,
        },
      },
      select: { id: true, dueDate: true },
    });

    if (!progression) {
      throw createError({ statusCode: 404, message: 'Progression introuvable pour ce stagiaire' });
    }

    if (!progression.dueDate) {
      throw createError({
        statusCode: 409,
        message: 'Aucune échéance définie pour cette progression',
      });
    }

    const newDueDate = new Date(progression.dueDate);
    // extendDays est garanti non-undefined ici grâce au .refine() Zod
    newDueDate.setDate(newDueDate.getDate() + (extendDays ?? 0));

    await prisma.progression.update({
      where: { id: progression.id },
      data: {
        dueDate: newDueDate,
        overrideBy: dbUser.id,
        overrideReason: reason,
      },
    });
  }

  // ── Créer l'entrée d'audit log (immuable) ────────────────────────────────
  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: `submission.override.${action}`,
      entityType: 'Submission',
      entityId: submissionId,
      metadata: {
        stagiaireId,
        cohorteId,
        reason,
        action,
        ...(extendDays !== undefined ? { extendDays } : {}),
      },
    },
  });

  logger.warn(
    {
      formateurId: hashId(dbUser.id),
      stagiaireIdHash: hashId(stagiaireId),
      submissionId,
      action,
    },
    'stagiaire.override.applied',
  );

  return { success: true };
});
