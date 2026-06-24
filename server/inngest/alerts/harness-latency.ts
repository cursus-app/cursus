import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { sendSlackAlert, resolvedAlert } from '~~/server/utils/alerts';
import { inngest } from '~~/server/inngest/client';

const LATENCY_THRESHOLD_MS = 7 * 60 * 1000; // 7 minutes
const WINDOW_MINUTES = 30;
const RUNBOOK_URL =
  'https://github.com/cursus-app/cursus/blob/main/docs/runbooks/harness-latency-high.md';

export const alertHarnessLatency = inngest.createFunction(
  {
    id: 'alerts.harness.latency.check',
    name: 'Alerte: latence harnais p95',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async () => {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

    // On requête les HarnessRun complétés dans la fenêtre glissante.
    // Si la table n'existe pas encore (avant ST-06.x), on skip gracefully.
    let p95Ms: number | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runs = await (prisma as any).harnessRun?.findMany({
        where: {
          completedAt: { gte: windowStart },
          status: { in: ['success', 'failure'] },
        },
        select: { durationMs: true },
        orderBy: { durationMs: 'asc' },
      });

      if (runs && runs.length > 0) {
        const idx = Math.floor(runs.length * 0.95);
        const p95Run = runs[Math.min(idx, runs.length - 1)] as { durationMs: number } | undefined;
        p95Ms = p95Run?.durationMs ?? null;
      }
    } catch (err) {
      // Table HarnessRun pas encore migrée — skip cette vérification
      logger.warn({ event: 'alerts.harness.latency.skip', reason: 'table_not_found', err });
      return { skipped: true, reason: 'table_not_found' };
    }

    logger.info({
      event: 'alerts.harness.latency.check',
      p95_ms: p95Ms,
      threshold_ms: LATENCY_THRESHOLD_MS,
    });

    if (p95Ms !== null && p95Ms > LATENCY_THRESHOLD_MS) {
      await sendSlackAlert({
        name: 'Harnais: latence p95 élevée',
        severity: 'warning',
        message: `La latence p95 du harnais GitHub Actions dépasse le seuil depuis ${WINDOW_MINUTES} min.\n*Vérifier* : jobs en attente, GitHub API rate limit, runner overload.`,
        currentValue: `${Math.round(p95Ms / 1000)}s`,
        threshold: `${Math.round(LATENCY_THRESHOLD_MS / 1000)}s`,
        runbookUrl: RUNBOOK_URL,
      });
    } else if (p95Ms !== null) {
      resolvedAlert('alerts.harness.latency');
    }

    return {
      p95Ms,
      thresholdMs: LATENCY_THRESHOLD_MS,
      triggered: p95Ms !== null && p95Ms > LATENCY_THRESHOLD_MS,
    };
  },
);
