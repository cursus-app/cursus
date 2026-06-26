/**
 * POST /api/cursus/:id/clone — deep-clone d'un cursus (ST-03.6).
 *
 * Crée un nouveau cursus brouillon avec :
 *  - titre : "<titre original> (copie)", tronqué à 200 chars si nécessaire.
 *  - statut DRAFT (quel que soit le statut du cursus source).
 *  - tous ses modules copiés (indépendants du source — deep clone).
 *  - owner = utilisateur appelant.
 *
 * L'opération est atomique via $transaction.
 * Les quizs sont copiés séparément puis liés aux nouveaux modules.
 */
import { serverSupabaseUser } from '#supabase/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

/** Longueur max du titre cursus dans le schéma Prisma. */
const MAX_TITLE_LENGTH = 200;

/** Génère un slug unique en ajoutant un suffixe aléatoire à la base fournie. */
function buildUniqueSlug(baseSlug: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  const maxBase = 80 - 1 - suffix.length; // réserve tiret + suffix
  return `${baseSlug.slice(0, maxBase)}-${suffix}`;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cursus:clone:${supabaseUser['id']}`, 10, 60 * 60 * 1_000);

  const [dbUser, sourceCursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { week: 'asc' },
          select: {
            id: true,
            week: true,
            title: true,
            objectives: true,
            resourcesJson: true,
            deliverableSpecJson: true,
            xpReward: true,
            badgeId: true,
            quiz: {
              select: {
                id: true,
                title: true,
                questionsJson: true,
                passingScore: true,
                randomize: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!sourceCursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === sourceCursus.ownerId;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  // Construire le titre cloné — tronquer si nécessaire avant d'ajouter le suffixe.
  const suffix = ' (copie)';
  const rawTitle = `${sourceCursus.title}${suffix}`;
  const cloneTitle =
    rawTitle.length > MAX_TITLE_LENGTH
      ? `${sourceCursus.title.slice(0, MAX_TITLE_LENGTH - suffix.length)}${suffix}`
      : rawTitle;

  const cloneSlug = buildUniqueSlug(sourceCursus.slug);

  const clonedCursus = await prisma.$transaction(async (tx) => {
    // 1. Créer le cursus clone (sans modules pour l'instant)
    const newCursus = await tx.cursus.create({
      data: {
        title: cloneTitle,
        slug: cloneSlug,
        domain: sourceCursus.domain,
        level: sourceCursus.level,
        durationWeeks: sourceCursus.durationWeeks,
        description: sourceCursus.description,
        prerequisites: sourceCursus.prerequisites,
        status: 'DRAFT',
        ownerId: supabaseUser['id'],
      },
    });

    // 2. Pour chaque module du source, copier le quiz si présent puis créer le module.
    for (const mod of sourceCursus.modules) {
      let newQuizId: string | null = null;

      if (mod.quiz) {
        const newQuiz = await tx.quiz.create({
          data: {
            title: mod.quiz.title,
            // Prisma returns JsonValue (includes null); cast to InputJsonValue for write.
            questionsJson: mod.quiz.questionsJson as Prisma.InputJsonValue,
            passingScore: mod.quiz.passingScore,
            randomize: mod.quiz.randomize,
          },
        });
        newQuizId = newQuiz.id;
      }

      await tx.module.create({
        data: {
          cursusId: newCursus.id,
          week: mod.week,
          title: mod.title,
          objectives: mod.objectives,
          // Prisma returns JsonValue (includes null); cast to InputJsonValue for write.
          resourcesJson: mod.resourcesJson as Prisma.InputJsonValue,
          deliverableSpecJson: mod.deliverableSpecJson as Prisma.InputJsonValue,
          xpReward: mod.xpReward,
          badgeId: mod.badgeId,
          ...(newQuizId !== null ? { quizId: newQuizId } : {}),
        },
      });
    }

    // 3. Retourner le cursus complet avec le compte de modules.
    return tx.cursus.findUniqueOrThrow({
      where: { id: newCursus.id },
      include: {
        _count: { select: { modules: true, versions: true } },
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, publishedAt: true },
        },
      },
    });
  });

  // 4. Audit log
  logger.info(
    {
      sourceCursusId: id,
      cloneCursusId: clonedCursus.id,
      moduleCount: sourceCursus.modules.length,
      userIdHash: hashId(supabaseUser['id']),
    },
    'cursus.duplicated',
  );

  return clonedCursus;
});
