/**
 * Inngest event handler — Attribution XP automatique.
 * ST-11.1 — TT-11.1.2
 *
 * Écoute l'event `submission/validated` émis par le webhook harness.
 * Idémpotence : `submission.xpAwardedAt` non-null = skip.
 * La mise à jour est atomique via transaction Prisma pour éviter les races.
 *
 * Effets :
 *   1. Marque `submission.xpAwardedAt = now()`
 *   2. Incrémente `user.xpTotal += module.xpReward`
 *   3. Crée une Notification SUBMISSION_VALIDATED (contient le montant XP)
 *   4. Si objectif mensuel atteint → crée une Notification spéciale
 */

import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export interface SubmissionValidatedEvent {
  name: 'submission/validated';
  data: {
    submissionId: string;
    userId: string;
    moduleId: string;
  };
}

export const xpAwardFunction = inngest.createFunction(
  {
    id: 'xp-award',
    name: 'XP — Attribution automatique à la validation',
    retries: 3,
    triggers: [{ event: 'submission/validated' }],
  },
  async ({ event, step }) => {
    const { submissionId, userId, moduleId } = event.data as SubmissionValidatedEvent['data'];

    const xpAwarded = await step.run('award-xp', async () => {
      // Charger la soumission + module + user en parallèle
      const [submission, module] = await Promise.all([
        prisma.submission.findUnique({
          where: { id: submissionId },
          select: { id: true, xpAwardedAt: true },
        }),
        prisma.module.findUnique({
          where: { id: moduleId },
          select: { id: true, xpReward: true },
        }),
      ]);

      if (!submission) {
        logger.warn({ submissionId: hashId(submissionId) }, 'xp.award.submission_not_found');
        return null;
      }

      // Idémpotence : XP déjà attribués pour cette soumission
      if (submission.xpAwardedAt !== null) {
        logger.info(
          { submissionId: hashId(submissionId), xpAwardedAt: submission.xpAwardedAt },
          'xp.award.already_awarded',
        );
        return null;
      }

      const xpReward = module?.xpReward ?? 100;

      // Transaction atomique : marque xpAwardedAt + incrémente xpTotal
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Garde idémpotente au niveau transaction (évite race condition)
        const locked = await tx.submission.findUnique({
          where: { id: submissionId, xpAwardedAt: null },
          select: { id: true },
        });

        if (!locked) {
          return null;
        }

        await tx.submission.update({
          where: { id: submissionId },
          data: { xpAwardedAt: new Date() },
        });

        return tx.user.update({
          where: { id: userId },
          data: { xpTotal: { increment: xpReward } },
          select: { id: true, xpTotal: true, xpObjectiveMonthly: true },
        });
      });

      if (!updatedUser) {
        return null;
      }

      return {
        xpReward,
        xpTotal: updatedUser.xpTotal,
        xpObjectiveMonthly: updatedUser.xpObjectiveMonthly,
      };
    });

    if (!xpAwarded) {
      return { skipped: true };
    }

    const { xpReward, xpTotal, xpObjectiveMonthly } = xpAwarded;

    // Notification standard +XP
    await step.run('notify-xp', async () => {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SUBMISSION_VALIDATED',
          title: `+${xpReward} XP`,
          body: `Tu as gagné ${xpReward} XP pour ce livrable ! Total : ${xpTotal} XP`,
        },
      });
    });

    // Notification spéciale si objectif mensuel atteint
    const objectiveMet =
      xpObjectiveMonthly !== null &&
      xpObjectiveMonthly !== undefined &&
      xpTotal >= xpObjectiveMonthly &&
      xpTotal - xpReward < xpObjectiveMonthly;

    if (objectiveMet) {
      await step.run('notify-objective-met', async () => {
        await prisma.notification.create({
          data: {
            userId,
            type: 'SUBMISSION_VALIDATED',
            title: '🎯 Objectif mensuel atteint !',
            body: `Félicitations ! Tu as atteint ton objectif de ${xpObjectiveMonthly} XP ce mois-ci.`,
          },
        });
      });
    }

    logger.info(
      { userIdHash: hashId(userId), submissionIdHash: hashId(submissionId), xpReward, xpTotal },
      'xp.award.completed',
    );

    return { xpReward, xpTotal, objectiveMet: objectiveMet };
  },
);
