/**
 * POST /api/me/progressions/:progressionId/submit
 *
 * Crée une Submission + HarnessRun pour un livrable de stagiaire et déclenche
 * le harnais via Inngest.
 *
 * Sécurité :
 *  - Auth Supabase requise (sinon 401)
 *  - Rate limit : 5 soumissions / module / heure
 *  - Anti-spam : 10 soumissions échouées max par semaine glissante
 *  - Validation que le repo GitHub appartient au compte lié du stagiaire
 *  - Valide qu'aucune analyse n'est en cours pour ce module
 *
 * Cf. ST-05.2 — TT-05.2.1.
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { inngest } from '~~/server/utils/inngest';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import {
  SubmitDelivrableSchema,
  SUBMISSION_SPAM_LIMIT,
  SUBMISSION_SPAM_WINDOW_MS,
  SUBMISSION_RATE_LIMIT,
} from '~~/shared/schemas/submission';
import type { SubmitDelivrableResponse } from '~~/shared/schemas/submission';

// ─── Schéma route param ────────────────────────────────────────────────────────

const RouteParamSchema = z.object({
  progressionId: z.string().min(1),
});

export default defineEventHandler(async (event): Promise<SubmitDelivrableResponse> => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const userId = supabaseUser['id'];
  const uid = hashId(userId);

  // ── Param validation ────────────────────────────────────────────────────────
  const paramParse = RouteParamSchema.safeParse(getRouterParams(event));
  if (!paramParse.success) {
    throw createError({ statusCode: 400, message: 'submission.errors.invalidProgressionId' });
  }
  const { progressionId } = paramParse.data;

  // ── Body validation (Zod) ───────────────────────────────────────────────────
  const body = await readValidatedBody(event, (raw) => SubmitDelivrableSchema.safeParse(raw));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: 'submission.errors.invalidBody',
      data: body.error.flatten(),
    });
  }

  const { repoUrl, deployUrl } = body.data;
  const safeDeployUrl = deployUrl && deployUrl.length > 0 ? deployUrl : null;

  // ── Charger l'utilisateur DB ────────────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, githubHandle: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ── Validation : repo appartient au stagiaire ───────────────────────────────
  if (!dbUser.githubHandle) {
    throw createError({
      statusCode: 403,
      message: 'submission.errors.githubHandleRequired',
    });
  }

  const normalizedHandle = dbUser.githubHandle.toLowerCase();
  const normalizedRepoUrl = repoUrl.toLowerCase();

  // Le repo doit contenir github.com/<handle>/ dans l'URL
  if (!normalizedRepoUrl.includes(`github.com/${normalizedHandle}/`)) {
    throw createError({
      statusCode: 403,
      message: 'submission.errors.repoNotOwned',
    });
  }

  // ── Charger la progression ───────────────────────────────────────────────────
  const progression = await prisma.progression.findUnique({
    where: { id: progressionId },
    include: {
      cohortModule: {
        include: {
          module: {
            select: {
              id: true,
              title: true,
              deliverableSpecJson: true,
            },
          },
        },
      },
    },
  });

  if (!progression) {
    throw createError({ statusCode: 404, message: 'submission.errors.progressionNotFound' });
  }

  // ── Vérification propriété ───────────────────────────────────────────────────
  if (progression.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  const moduleId = progression.cohortModule.module.id;
  const deliverableSpec = progression.cohortModule.module.deliverableSpecJson;

  // ── Vérification statut progression ─────────────────────────────────────────
  const terminalStatuses = ['VALIDE', 'VALIDE_OVERRIDE'] as const;
  if ((terminalStatuses as readonly string[]).includes(progression.status)) {
    throw createError({
      statusCode: 409,
      message: 'submission.errors.alreadyValidated',
    });
  }

  // ── Rate limit par module / heure ────────────────────────────────────────────
  checkRateLimit(
    `submission:${userId}:${moduleId}`,
    SUBMISSION_RATE_LIMIT,
    60 * 60 * 1_000,
  );

  // ── Vérification : pas d'analyse en cours ────────────────────────────────────
  const runningSubmission = await prisma.submission.findFirst({
    where: {
      userId,
      moduleId,
      status: 'RUNNING',
    },
    select: { id: true },
  });

  if (runningSubmission) {
    throw createError({
      statusCode: 409,
      message: 'submission.errors.alreadyRunning',
    });
  }

  // ── Anti-spam : max 10 soumissions échouées par semaine ──────────────────────
  const spamWindowStart = new Date(Date.now() - SUBMISSION_SPAM_WINDOW_MS);

  const failedCount = await prisma.submission.count({
    where: {
      userId,
      moduleId,
      status: { in: ['FAILED', 'TIMEOUT', 'BLOCKED'] },
      submittedAt: { gte: spamWindowStart },
    },
  });

  if (failedCount >= SUBMISSION_SPAM_LIMIT) {
    // Créer une alerte pour le formateur
    try {
      await prisma.alert.create({
        data: {
          userId,
          kind: 'SUBMISSION_REPEATEDLY_FAILED',
          severity: 'HIGH',
          sourceType: 'MODULE',
          sourceId: moduleId,
          context: {
            failedCount,
            moduleId,
            progressionId,
          },
        },
      });
    } catch (alertErr) {
      logger.warn({ uid, event: 'submission.spam.alert_failed', err: alertErr });
    }

    throw createError({
      statusCode: 429,
      message: 'submission.errors.spamBlocked',
    });
  }

  // ── Calcul numéro de tentative ───────────────────────────────────────────────
  const lastSubmission = await prisma.submission.findFirst({
    where: { userId, moduleId },
    orderBy: { submittedAt: 'desc' },
    select: { attemptNumber: true },
  });

  const attemptNumber = (lastSubmission?.attemptNumber ?? 0) + 1;

  // ── Créer la Submission + HarnessRun (transaction) ───────────────────────────
  const { submission, harnessRun } = await prisma.$transaction(async (tx) => {
    const newSubmission = await tx.submission.create({
      data: {
        userId,
        moduleId,
        repoUrl,
        deployUrl: safeDeployUrl,
        status: 'RUNNING',
        attemptNumber,
      },
    });

    const newHarnessRun = await tx.harnessRun.create({
      data: {
        submissionId: newSubmission.id,
        status: 'QUEUED',
      },
    });

    return { submission: newSubmission, harnessRun: newHarnessRun };
  });

  // ── Transition progression → SOUMIS ──────────────────────────────────────────
  // La progression peut être EN_COURS → SOUMIS (première soumission ou retry après échec).
  // On effectue la mise à jour directe car le stateMachine n'est disponible que si
  // la progression est dans un état compatible.
  try {
    if (progression.status === 'EN_COURS') {
      await prisma.progression.update({
        where: { id: progressionId },
        data: {
          status: 'SOUMIS',
          submittedAt: new Date(),
        },
      });
    }
  } catch (transitionErr) {
    logger.warn(
      { uid, event: 'submission.progression.transition_failed', progressionId, err: transitionErr },
      'Impossible de transitionner la progression vers SOUMIS',
    );
    // On continue même si la transition échoue — la soumission est créée
  }

  // ── Dispatcher l'événement Inngest ───────────────────────────────────────────
  await inngest.send({
    name: 'cursus/harness.trigger',
    data: {
      submissionId: submission.id,
      repoUrl,
      deployUrl: safeDeployUrl,
      criteriaJson: deliverableSpec,
    },
  });

  logger.info(
    {
      uid,
      event: 'submission.created',
      submissionId: submission.id,
      harnessRunId: harnessRun.id,
      moduleId,
      attemptNumber,
    },
    'Soumission créée et harnais déclenché',
  );

  return {
    submissionId: submission.id,
    harnessRunId: harnessRun.id,
  };
});
