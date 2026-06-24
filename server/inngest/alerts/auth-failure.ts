import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { sendSlackAlert, resolvedAlert } from '~~/server/utils/alerts';
import { inngest } from '~~/server/inngest/client';

const FAILURE_RATE_THRESHOLD = 0.1; // 10%
const WINDOW_MINUTES = 10;
const MIN_ATTEMPTS = 5; // ignorer si < 5 tentatives (évite faux positifs sur faible trafic)
const RUNBOOK_URL =
  'https://github.com/cursus-app/cursus/blob/main/docs/runbooks/auth-failure-high.md';

export const alertAuthFailure = inngest.createFunction(
  {
    id: 'alerts.auth.failure.check',
    name: 'Alerte: taux échec auth élevé',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async () => {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

    let failureRate: number | null = null;
    let total = 0;
    let failures = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs = await (prisma as any).auditLog?.findMany({
        where: {
          createdAt: { gte: windowStart },
          action: { in: ['auth.login_success', 'auth.login_failure'] },
        },
        select: { action: true },
      });

      if (logs && logs.length >= MIN_ATTEMPTS) {
        total = logs.length;
        failures = (logs as { action: string }[]).filter(
          (l) => l.action === 'auth.login_failure',
        ).length;
        failureRate = failures / total;
      }
    } catch (err) {
      logger.warn({ event: 'alerts.auth.failure.skip', reason: 'table_not_found', err });
      return { skipped: true, reason: 'table_not_found' };
    }

    logger.info({
      event: 'alerts.auth.failure.check',
      failure_rate: failureRate,
      threshold: FAILURE_RATE_THRESHOLD,
      total_attempts: total,
    });

    if (failureRate !== null && failureRate > FAILURE_RATE_THRESHOLD) {
      await sendSlackAlert({
        name: "Auth: taux d'échec élevé",
        severity: 'critical',
        message: `Le taux d'échec d'authentification est anormalement élevé (${failures}/${total} sur ${WINDOW_MINUTES} min).\n*Vérifier* : brute force, bug auth, provider Supabase en dégradé.`,
        currentValue: `${Math.round(failureRate * 100)}%`,
        threshold: `${Math.round(FAILURE_RATE_THRESHOLD * 100)}%`,
        runbookUrl: RUNBOOK_URL,
      });
    } else if (failureRate !== null) {
      resolvedAlert('alerts.auth.failure');
    }

    return {
      failureRate,
      threshold: FAILURE_RATE_THRESHOLD,
      triggered: failureRate !== null && failureRate > FAILURE_RATE_THRESHOLD,
    };
  },
);
