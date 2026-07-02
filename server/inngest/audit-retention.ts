/**
 * Inngest cron — rétention audit log 12 mois.
 * ST-08.4 — TT-08.4.4.
 *
 * Tourne tous les jours à 02:00 UTC.
 * Supprime les entrées d'audit log ayant plus de 12 mois — conformité RGPD.
 */
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const RETENTION_MONTHS = 12;

export const auditRetentionFunction = inngest.createFunction(
  {
    id: 'audit-retention',
    name: 'Audit Log — Rétention 12 mois',
    retries: 2,
    triggers: [{ cron: '0 2 * * *' }],
  },
  async ({ step }) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - RETENTION_MONTHS);

    const deleted = await step.run('delete-old-entries', async () => {
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
      return result.count;
    });

    logger.info(
      { deleted, cutoffDate, retentionMonths: RETENTION_MONTHS },
      'audit.retention.completed',
    );

    return { deleted, cutoffDate };
  },
);
