/**
 * Fonction Inngest déclenchée par l'événement 'cursus/harness.trigger'.
 *
 * Simule l'exécution du harnais GitHub Actions :
 *  - Mise à jour du HarnessRun en RUNNING
 *  - (En production : appel GitHub Actions API + attente résultat via webhook)
 *  - Mise à jour finale SUCCESS/FAILURE/TIMEOUT
 *  - Mise à jour du statut de la Submission
 *
 * Cf. ST-05.2 — TT-05.2.1 / ST-06.1 (intégration GitHub Actions à venir).
 */
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

interface HarnessTriggerData {
  submissionId: string;
  repoUrl: string;
  deployUrl: string | null;
  criteriaJson: unknown;
}

export const harnessTriggerFunction = inngest.createFunction(
  {
    id: 'cursus.harness.trigger',
    name: 'Déclencher le harnais GitHub Actions',
    retries: 2,
    triggers: [{ event: 'cursus/harness.trigger' }],
  },
  async ({ event, step }) => {
    const { submissionId, repoUrl, deployUrl, criteriaJson } = event.data as HarnessTriggerData;

    const sid = hashId(submissionId);

    // ── 1. Marquer le HarnessRun en RUNNING ────────────────────────────────
    await step.run('mark-running', async () => {
      const harnessRun = await prisma.harnessRun.findFirst({
        where: { submissionId, status: 'QUEUED' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!harnessRun) {
        logger.warn(
          { sid, event: 'harness.trigger.run_not_found', submissionId },
          'HarnessRun QUEUED introuvable pour cette soumission',
        );
        return;
      }

      await prisma.harnessRun.update({
        where: { id: harnessRun.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      logger.info(
        { sid, event: 'harness.trigger.running', submissionId, harnessRunId: harnessRun.id },
        'HarnessRun passé en RUNNING',
      );
    });

    // ── 2. Attendre le résultat du harnais (placeholder) ───────────────────
    // En production, cette étape déclencherait un GitHub Actions workflow
    // et attendrait le webhook de résultat. Pour le MVP, on simule un succès
    // minimal pour valider le flux complet.
    //
    // ST-06.1 remplacera ce placeholder par l'intégration GitHub Actions réelle.
    await step.sleep('wait-for-harness', '30s');

    // ── 3. Simuler le résultat (sera remplacé par ST-06.1) ─────────────────
    await step.run('process-result', async () => {
      const harnessRun = await prisma.harnessRun.findFirst({
        where: { submissionId, status: 'RUNNING' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!harnessRun) {
        logger.warn(
          { sid, event: 'harness.trigger.result_run_not_found', submissionId },
          'HarnessRun RUNNING introuvable pour traiter le résultat',
        );
        return;
      }

      // En attente de ST-06.1 — on laisse le HarnessRun en RUNNING pour que
      // le webhook GitHub puisse le mettre à jour.
      logger.info(
        {
          sid,
          event: 'harness.trigger.awaiting_github',
          submissionId,
          harnessRunId: harnessRun.id,
          repoUrl,
          deployUrl,
          criteriaChecksCount: Array.isArray(criteriaJson) ? criteriaJson.length : 0,
        },
        'En attente du résultat GitHub Actions (ST-06.1)',
      );
    });

    return { submissionId, status: 'dispatched' };
  },
);
