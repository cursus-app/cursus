/**
 * Inngest cron — archive automatiquement les cohortes COMPLETED depuis 30+ jours.
 * Cf. ST-04.1 — TT-04.1.4 (job archivage).
 *
 * Tournant tous les jours à 3h UTC pour minimiser l'impact sur les utilisateurs.
 */
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

export const archiveCompletedCohortes = inngest.createFunction(
  {
    id: 'archive-completed-cohortes',
    name: 'Cohorte — archivage automatique des cohortes terminées (30j)',
    retries: 3,
    triggers: [{ cron: '0 3 * * *' }],
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);

    const updated = await step.run('archive-old-cohortes', async () => {
      const result = await prisma.cohorte.updateMany({
        where: {
          status: 'COMPLETED',
          updatedAt: { lt: cutoff },
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      logger.info(
        { archivedCount: result.count, cutoff: cutoff.toISOString() },
        'cohorte.auto_archive.done',
      );

      return result;
    });

    return { archived: updated.count };
  },
);
