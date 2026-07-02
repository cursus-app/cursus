/**
 * Inngest event handler — Attribution automatique de badges.
 * ST-11.2 — TT-11.2.3
 *
 * Écoute l'event `submission/validated` émis par le webhook harness.
 * Charge le checksJson du HarnessRun associé, identifie les badges
 * correspondants, et les attribue de façon idémpotente (contrainte @@unique).
 *
 * Effets :
 *   1. Charge le HarnessRun SUCCESS le plus récent pour la soumission
 *   2. Extrait les check_id réussis
 *   3. Fait correspondre les badges via badgeRules.matchBadgesForChecks()
 *   4. Crée les UserBadge (skip si contrainte @@unique violation)
 *   5. Crée une Notification BADGE_AWARDED pour chaque nouveau badge
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { matchBadgesForChecks, BADGE_DEFINITIONS } from '~~/server/utils/badgeRules';

const EventDataSchema = z.object({
  submissionId: z.string().uuid(),
  userId: z.string().uuid(),
  moduleId: z.string().uuid(),
});

const ChecksJsonSchema = z
  .object({
    checks: z.array(z.object({ check_id: z.string(), status: z.string() })).optional(),
  })
  .nullable();

export const badgeAwardFunction = inngest.createFunction(
  {
    id: 'badge-award',
    name: 'Badges — Attribution automatique',
    retries: 3,
    triggers: [{ event: 'submission/validated' }],
  },
  async ({ event, step }) => {
    const parsed = EventDataSchema.safeParse(event.data);
    if (!parsed.success) {
      logger.error({ errors: parsed.error.flatten() }, 'badge.award.invalid_event_data');
      return { skipped: true };
    }
    const { submissionId, userId } = parsed.data;

    const awarded = await step.run('award-badges', async () => {
      // Charger le HarnessRun SUCCESS le plus récent pour cette soumission
      const harnessRun = await prisma.harnessRun.findFirst({
        where: { submissionId, status: 'SUCCESS' },
        orderBy: { finishedAt: 'desc' },
        select: { checksJson: true },
      });

      if (!harnessRun) {
        logger.warn(
          { submissionIdHash: hashId(submissionId) },
          'badge.award.harness_run_not_found',
        );
        return [];
      }

      // Valider le format checksJson via Zod (frontière de données externe)
      const checksJsonParsed = ChecksJsonSchema.safeParse(harnessRun.checksJson);
      if (!checksJsonParsed.success) {
        logger.error(
          { submissionIdHash: hashId(submissionId), errors: checksJsonParsed.error.flatten() },
          'badge.award.invalid_checks_json',
        );
        return [];
      }

      const successfulCheckIds = new Set(
        (checksJsonParsed.data?.checks ?? [])
          .filter((c) => c.status === 'success')
          .map((c) => c.check_id),
      );

      // Identifier les codes de badges correspondants
      const matchingCodes = matchBadgesForChecks(successfulCheckIds);
      if (matchingCodes.length === 0) {
        return [];
      }

      // Charger les enregistrements Badge en base
      const badges = await prisma.badge.findMany({
        where: { code: { in: matchingCodes } },
        select: { id: true, code: true },
      });

      // Attribuer les badges (idémpotent via contrainte @@unique [userId, badgeId])
      const awardedCodes: string[] = [];
      for (const badge of badges) {
        try {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
              awardedByRule: badge.code,
            },
          });
          awardedCodes.push(badge.code);

          // Notification pour le stagiaire
          const definition = BADGE_DEFINITIONS.find((b) => b.code === badge.code);
          await prisma.notification.create({
            data: {
              userId,
              type: 'BADGE_AWARDED',
              title: 'Badge débloqué !',
              body: `Tu as débloqué le badge "${definition?.name ?? badge.code}".`,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // unique constraint → badge already awarded, idempotent skip
          } else {
            // Unexpected error → re-throw so Inngest retries (retries: 3)
            throw err;
          }
        }
      }

      return awardedCodes;
    });

    if (awarded.length > 0) {
      logger.info(
        {
          userIdHash: hashId(userId),
          submissionIdHash: hashId(submissionId),
          badges: awarded,
        },
        'badge.award.completed',
      );
    }

    return { awarded };
  },
);
