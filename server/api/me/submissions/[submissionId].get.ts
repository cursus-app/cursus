/**
 * GET /api/me/submissions/:submissionId
 *
 * Retourne une soumission avec son dernier HarnessRun et les checks associés.
 * Seul le propriétaire de la soumission peut y accéder.
 *
 * Cf. ST-05.2 — TT-05.2.1.
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import type { SubmissionWithRun } from '~~/shared/schemas/submission';

const RouteParamSchema = z.object({
  submissionId: z.string().uuid({ message: 'submission.errors.invalidSubmissionId' }),
});

export default defineEventHandler(async (event): Promise<SubmissionWithRun> => {
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
    throw createError({ statusCode: 400, message: 'submission.errors.invalidSubmissionId' });
  }
  const { submissionId } = paramParse.data;

  // ── Charger la soumission avec le dernier HarnessRun ──────────────────────
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      harnessRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!submission) {
    throw createError({ statusCode: 404, message: 'submission.errors.notFound' });
  }

  // ── Vérification propriété ───────────────────────────────────────────────────
  if (submission.userId !== userId) {
    logger.warn(
      { uid, event: 'submission.access.forbidden', submissionId },
      'Tentative accès soumission non autorisée',
    );
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  const latestRun = submission.harnessRuns[0] ?? null;

  return {
    id: submission.id,
    moduleId: submission.moduleId,
    repoUrl: submission.repoUrl,
    deployUrl: submission.deployUrl,
    status: submission.status,
    attemptNumber: submission.attemptNumber,
    submittedAt: submission.submittedAt.toISOString(),
    validatedAt: submission.validatedAt?.toISOString() ?? null,
    latestHarnessRun: latestRun
      ? {
          id: latestRun.id,
          status: latestRun.status,
          startedAt: latestRun.startedAt?.toISOString() ?? null,
          finishedAt: latestRun.finishedAt?.toISOString() ?? null,
          checksJson: latestRun.checksJson,
          errorMessage: latestRun.errorMessage,
          createdAt: latestRun.createdAt.toISOString(),
        }
      : null,
  };
});
