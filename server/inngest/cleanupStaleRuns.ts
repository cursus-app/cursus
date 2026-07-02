/**
 * Inngest cron — nettoyage des HarnessRun bloqués.
 *
 * Tourne toutes les 5 minutes.
 *
 * Deux classes de runs stales :
 *   RUNNING  > 10 min sans résultat → le workflow GH Actions a dépassé son timeout (5 min)
 *              + le webhook n'est jamais arrivé (réseau mort, runner tué).
 *   QUEUED   > 30 min sans démarrer → l'événement Inngest a été perdu (outage, redéploiement).
 *
 * Action : marquer TIMEOUT + errorMessage explicite.
 * Alerte : si le lot de TIMEOUT > 5 → Sentry critical + log structuré.
 *
 * Cf. ST-06.6 — TT-06.6.2 / TT-06.6.5.
 */
import * as Sentry from '@sentry/nuxt';
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const RUNNING_STALE_MS = 10 * 60 * 1_000; // 10 min
const QUEUED_STALE_MS = 30 * 60 * 1_000; // 30 min
const DLQ_ALERT_THRESHOLD = 5; // Sentry critical si ≥ 5 runs en un batch
// Le cron tourne toutes les 5 min — traiter par lot évite de charger
// des centaines de runs en mémoire lors d'un outage prolongé.
const BATCH_SIZE = 100;

export const cleanupStaleRuns = inngest.createFunction(
  {
    id: 'harness.cleanup.stale-runs',
    name: 'Harnais — Nettoyage des runs bloqués',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async () => {
    const now = new Date();
    const runningCutoff = new Date(now.getTime() - RUNNING_STALE_MS);
    const queuedCutoff = new Date(now.getTime() - QUEUED_STALE_MS);

    // ── 1. RUNNING trop longs (webhook perdu ou timeout GH Actions) ──────────
    const staleRunning = await prisma.harnessRun.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: runningCutoff },
      },
      select: { id: true, submissionId: true, githubRunId: true, startedAt: true },
      take: BATCH_SIZE,
      orderBy: { startedAt: 'asc' }, // les plus anciens en priorité
    });

    // ── 2. QUEUED jamais démarrés (événement Inngest perdu) ─────────────────
    const staleQueued = await prisma.harnessRun.findMany({
      where: {
        status: 'QUEUED',
        createdAt: { lt: queuedCutoff },
      },
      select: { id: true, submissionId: true, createdAt: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    const staleIds = [
      ...staleRunning.map((r) => ({
        id: r.id,
        reason: `RUNNING depuis ${Math.round((now.getTime() - (r.startedAt?.getTime() ?? 0)) / 60_000)} min — webhook perdu ou timeout GH Actions`,
      })),
      ...staleQueued.map((r) => ({
        id: r.id,
        reason: `QUEUED depuis ${Math.round((now.getTime() - r.createdAt.getTime()) / 60_000)} min — événement Inngest non consommé`,
      })),
    ];

    if (staleIds.length === 0) {
      logger.info({ event: 'harness.cleanup.nothing_to_do' }, 'Aucun run stale détecté');
      return { timedOut: 0 };
    }

    // ── 3. Marquer TIMEOUT en batch ──────────────────────────────────────────
    await prisma.harnessRun.updateMany({
      where: { id: { in: staleIds.map((r) => r.id) } },
      data: {
        status: 'TIMEOUT',
        finishedAt: now,
      },
    });

    // Mettre à jour les messages d'erreur individuellement (updateMany ne supporte pas les valeurs différentes)
    await Promise.all(
      staleIds.map((r) =>
        prisma.harnessRun.update({
          where: { id: r.id },
          data: { errorMessage: r.reason },
        }),
      ),
    );

    logger.warn(
      {
        event: 'harness.cleanup.stale_runs_timedout',
        count: staleIds.length,
        runningCount: staleRunning.length,
        queuedCount: staleQueued.length,
        runIds: staleIds.map((r) => r.id),
      },
      `${staleIds.length} runs stales marqués TIMEOUT`,
    );

    // ── 4. Alerte Sentry si seuil dépassé (DLQ en rafale) ──────────────────
    if (staleIds.length >= DLQ_ALERT_THRESHOLD) {
      Sentry.captureException(
        new Error(
          `harness.dlq.batch: ${staleIds.length} runs bloqués marqués TIMEOUT en un seul batch`,
        ),
        {
          level: 'fatal',
          tags: { component: 'harness', event: 'dlq.batch' },
          extra: {
            count: staleIds.length,
            runningCount: staleRunning.length,
            queuedCount: staleQueued.length,
            runIds: staleIds.map((r) => r.id),
          },
        },
      );

      logger.error(
        {
          event: 'harness.cleanup.dlq_alert',
          count: staleIds.length,
          threshold: DLQ_ALERT_THRESHOLD,
        },
        'ALERTE DLQ: nombre de runs bloqués dépasse le seuil critique',
      );
    }

    return {
      timedOut: staleIds.length,
      running: staleRunning.length,
      queued: staleQueued.length,
    };
  },
);
