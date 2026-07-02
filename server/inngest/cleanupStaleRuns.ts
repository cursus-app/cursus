/**
 * Inngest cron — Nettoyage des HarnessRuns bloqués (QUEUED/RUNNING > seuil).
 *
 * Exécuté toutes les 15 minutes. Détecte les runs qui n'ont pas avancé dans
 * le délai maximum et les marque TIMEOUT pour éviter un état inconsistant.
 *
 * Alertes :
 *  - Si > DLQ_ALERT_THRESHOLD runs expirés détectés dans la fenêtre → sendSlackAlert
 *
 * ST-06.6 — TT-06.6.4
 */

import * as Sentry from '@sentry/nuxt';
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { sendSlackAlert } from '~~/server/utils/alerts';

const QUEUED_TIMEOUT_MS = 5 * 60 * 1_000; // 5 min sans démarrage
const RUNNING_TIMEOUT_MS = 20 * 60 * 1_000; // 20 min sans résultat
const DLQ_ALERT_THRESHOLD = 5; // > 5 expirations → alerte
const RUNBOOK_URL =
  'https://github.com/cursus-app/cursus/blob/main/docs/runbooks/harness-stale-runs.md';

export const cleanupStaleRuns = inngest.createFunction(
  {
    id: 'harness.cleanup.stale-runs',
    name: 'Harnais — Nettoyage des runs bloqués',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async () => {
    const now = new Date();
    const queuedCutoff = new Date(now.getTime() - QUEUED_TIMEOUT_MS);
    const runningCutoff = new Date(now.getTime() - RUNNING_TIMEOUT_MS);

    // Trouver les runs expirés
    const staleRuns = await prisma.harnessRun.findMany({
      where: {
        OR: [
          // QUEUED depuis trop longtemps sans démarrage
          { status: 'QUEUED', createdAt: { lt: queuedCutoff } },
          // RUNNING depuis trop longtemps sans résultat
          { status: 'RUNNING', startedAt: { lt: runningCutoff } },
        ],
      },
      select: { id: true, status: true, submissionId: true, createdAt: true, startedAt: true },
    });

    if (staleRuns.length === 0) {
      logger.info({ count: 0 }, 'harness.cleanup.no_stale_runs');
      return { expired: 0 };
    }

    // Marquer tous les runs expirés en TIMEOUT en une seule opération
    const ids = staleRuns.map((r) => r.id);
    // Guard atomique sur les statuts non-terminaux : évite d'écraser un SUCCESS/FAILURE
    // arrivé entre le findMany et le updateMany (race condition ~50ms)
    const { count } = await prisma.harnessRun.updateMany({
      where: {
        id: { in: ids },
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      data: {
        status: 'TIMEOUT',
        finishedAt: now,
        errorMessage: 'Cleanup automatique — timeout dépassé sans résultat',
      },
    });

    logger.warn(
      {
        count,
        runIds: ids.slice(0, 20),
        totalIds: ids.length,
      },
      'harness.cleanup.stale_runs_expired',
    );

    // Alerte si le volume dépasse le seuil
    if (count > DLQ_ALERT_THRESHOLD) {
      const err = new Error(
        `[harness.cleanup] ${count} runs expirés détectés en une passe — investigation requise`,
      );
      Sentry.captureException(err, {
        level: 'fatal',
        tags: { component: 'harness-cleanup', event: 'dlq_threshold_exceeded' },
        extra: { count, runIds: ids, queuedCutoffIso: queuedCutoff.toISOString() },
      });

      await sendSlackAlert({
        name: 'Harnais: DLQ threshold dépassé',
        severity: 'critical',
        message: `${count} HarnessRuns expirés détectés dans cette passe de cleanup (seuil = ${DLQ_ALERT_THRESHOLD}).\nVérifier les runners GitHub Actions et le réseau.`,
        currentValue: String(count),
        threshold: String(DLQ_ALERT_THRESHOLD),
        runbookUrl: RUNBOOK_URL,
      });
    }

    return { expired: count };
  },
);
