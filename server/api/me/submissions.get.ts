/**
 * GET /api/me/submissions — liste paginée des soumissions de l'utilisateur authentifié.
 *
 * Query params :
 *   - status : 'all' | 'VALIDATED' | 'VALIDATED_OVERRIDE' | 'FAILED' | 'PENDING' | 'RUNNING' | 'TIMEOUT' | 'BLOCKED'
 *   - page   : numéro de page (≥1, défaut 1)
 *
 * Retourne les soumissions triées par date décroissante (plus récentes en premier),
 * avec le dernier HarnessRun associé et le titre du module.
 *
 * Sécurité : userId est toujours celui de la session — jamais un paramètre externe.
 * ST-05.4
 */

import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const PAGE_SIZE = 20;

const querySchema = z.object({
  status: z
    .enum(['all', 'PENDING', 'RUNNING', 'VALIDATED', 'VALIDATED_OVERRIDE', 'FAILED', 'TIMEOUT', 'BLOCKED'])
    .optional()
    .default('all'),
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = parseInt(v ?? '1', 10);
      return isNaN(n) || n < 1 ? 1 : n;
    }),
});

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true },
  });

  if (!dbUser) {
    logger.warn({ userId: supabaseUser['id'] }, 'submissions.user_not_found');
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const rawQuery = getQuery(event);
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' });
  }

  const { status, page } = parsed.data;

  // Filtre par statut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: Record<string, any> = { userId: dbUser.id };
  if (status !== 'all') {
    whereClause['status'] = status;
  }

  const [total, submissions] = await Promise.all([
    prisma.submission.count({ where: whereClause }),
    prisma.submission.findMany({
      where: whereClause,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        repoUrl: true,
        deployUrl: true,
        attemptNumber: true,
        submittedAt: true,
        validatedAt: true,
        module: {
          select: {
            id: true,
            title: true,
            week: true,
          },
        },
        harnessRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            githubWorkflowUrl: true,
            checksJson: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  logger.info(
    { userId: dbUser.id, status, page, total },
    'submissions.list',
  );

  return {
    data: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      repoUrl: s.repoUrl,
      deployUrl: s.deployUrl,
      attemptNumber: s.attemptNumber,
      submittedAt: s.submittedAt.toISOString(),
      validatedAt: s.validatedAt?.toISOString() ?? null,
      module: {
        id: s.module.id,
        title: s.module.title,
        week: s.module.week,
      },
      latestHarnessRun: s.harnessRuns[0]
        ? {
            id: s.harnessRuns[0].id,
            status: s.harnessRuns[0].status,
            githubWorkflowUrl: s.harnessRuns[0].githubWorkflowUrl,
            checksJson: s.harnessRuns[0].checksJson,
            startedAt: s.harnessRuns[0].startedAt?.toISOString() ?? null,
            finishedAt: s.harnessRuns[0].finishedAt?.toISOString() ?? null,
          }
        : null,
    })),
    meta: {
      total,
      page,
      perPage: PAGE_SIZE,
      totalPages,
    },
  };
});
