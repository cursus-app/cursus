/**
 * GET /api/me/harness-runs/:id
 *
 * Retourne un HarnessRun par ID — ownership vérifié via la soumission liée.
 * Utilisé par useHarnessRunRealtime comme fallback polling quand WS est bloqué.
 *
 * Cf. ST-06.4 — TT-06.4.3 (fallback polling).
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

const RouteParamSchema = z.object({
  id: z.string().uuid({ message: 'harness.errors.invalidRunId' }),
});

interface HarnessRunResponse {
  harnessRun: {
    id: string;
    status: string;
    checksJson: unknown;
  } | null;
}

export default defineEventHandler(async (event): Promise<HarnessRunResponse> => {
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
    throw createError({ statusCode: 400, message: 'harness.errors.invalidRunId' });
  }
  const { id } = paramParse.data;

  // ── Charger le run avec la soumission pour vérifier la propriété ──────────
  const run = await prisma.harnessRun.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      checksJson: true,
      submission: {
        select: { userId: true },
      },
    },
  });

  if (!run) {
    return { harnessRun: null };
  }

  // ── Vérification propriété ───────────────────────────────────────────────────
  if (run.submission.userId !== userId) {
    logger.warn(
      { uid, event: 'harness_run.access.forbidden', harnessRunId: id },
      'Tentative accès HarnessRun non autorisée',
    );
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  return {
    harnessRun: {
      id: run.id,
      status: run.status,
      checksJson: run.checksJson,
    },
  };
});
