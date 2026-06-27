/**
 * Utilitaire harnais — point d'entrée pour déclencher une validation automatique.
 *
 * Flux :
 *  1. Vérifie le rate limit (max 10 runs/heure par submission)
 *  2. Crée un HarnessRun en DB (status = QUEUED)
 *  3. Dispatche l'événement Inngest "harness/trigger" pour le traitement async
 *
 * Cf. ST-06.1 — TT-06.1.5.
 */
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { inngest } from '~~/server/inngest/client';
import type { CriteriaJson } from '~~/shared/types/harness';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000; // 1 heure

export interface TriggerHarnessRunOptions {
  submissionId: string;
  repoUrl: string;
  deployUrl?: string;
  criteriaJson: CriteriaJson;
}

export interface TriggerHarnessRunResult {
  harnessRunId: string;
}

/**
 * Déclenche un run de harnais pour une submission.
 *
 * @throws H3Error 429 si le rate limit est atteint.
 * @throws H3Error 404 si la submission n'existe pas.
 */
export async function triggerHarnessRun(
  opts: TriggerHarnessRunOptions,
): Promise<TriggerHarnessRunResult> {
  const { submissionId, repoUrl, deployUrl, criteriaJson } = opts;

  // Rate limit — max 10 runs/h par submission
  checkRateLimit(`harness:trigger:${submissionId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

  // Vérifier que la submission existe
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true },
  });

  if (!submission) {
    throw createError({ statusCode: 404, message: `Submission ${submissionId} introuvable.` });
  }

  // Créer le HarnessRun en QUEUED
  const harnessRun = await prisma.harnessRun.create({
    data: {
      submissionId,
      status: 'QUEUED',
    },
    select: { id: true },
  });

  logger.info({ harnessRunId: harnessRun.id, submissionId }, 'harness.run.queued');

  // Dispatcher l'événement Inngest (async — ne pas awaiter le workflow GH)
  await inngest.send({
    name: 'harness/trigger',
    data: {
      harnessRunId: harnessRun.id,
      submissionId,
      repoUrl,
      deployUrl,
      criteriaJson: JSON.stringify(criteriaJson),
    },
  });

  return { harnessRunId: harnessRun.id };
}
