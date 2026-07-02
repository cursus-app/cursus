/**
 * POST /api/quizzes — création d'un quiz.
 *
 * Autorisé pour FORMATEUR_PRINCIPAL, CO_FORMATEUR et ADMIN.
 * Si `moduleId` est fourni :
 *  - 404 si le module n'existe pas.
 *  - 409 si le module a déjà un quiz.
 *  - 403 si l'utilisateur n'est pas propriétaire du cursus (sauf ADMIN).
 * Rate limit : 30 créations/heure par utilisateur.
 */
import { serverSupabaseUser } from '#supabase/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { createQuizSchema } from '~~/shared/schemas/quiz';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`quiz:create:${supabaseUser['id']}`, 30, 60 * 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // FORMATEUR_PRINCIPAL, CO_FORMATEUR et ADMIN peuvent créer des quiz.
  const allowedRoles = ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR', 'ADMIN'] as const;
  if (!allowedRoles.some((r) => r === dbUser.globalRole)) {
    logger.warn(
      { userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'quiz.create.forbidden',
    );
    throw createError({ statusCode: 403, message: 'quiz.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => createQuizSchema.parse(raw));

  // Vérifications préalables si moduleId fourni.
  if (body.moduleId) {
    const mod = await prisma.module.findUnique({
      where: { id: body.moduleId },
      select: {
        quizId: true,
        cursus: { select: { ownerId: true } },
      },
    });

    if (!mod) {
      throw createError({ statusCode: 404, message: 'quiz.errors.moduleNotFound' });
    }

    if (mod.quizId !== null) {
      throw createError({ statusCode: 409, message: 'quiz.errors.moduleAlreadyHasQuiz' });
    }

    const isAdmin = dbUser.globalRole === 'ADMIN';
    if (!isAdmin && mod.cursus.ownerId !== dbUser.id) {
      logger.warn(
        { userIdHash: hashId(dbUser.id), moduleId: body.moduleId },
        'quiz.create.moduleNotOwned',
      );
      throw createError({ statusCode: 403, message: 'quiz.errors.moduleNotOwned' });
    }
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: body.title,
      questionsJson: body.questions as unknown as Prisma.InputJsonValue,
      passingScore: body.passingScore,
      randomize: body.randomize,
    },
  });

  // Attacher au module si moduleId fourni.
  if (body.moduleId) {
    await prisma.module.update({
      where: { id: body.moduleId },
      data: { quizId: quiz.id },
    });
  }

  logger.info(
    {
      quizId: quiz.id,
      moduleId: body.moduleId ?? null,
      userIdHash: hashId(dbUser.id),
      questionCount: body.questions.length,
    },
    'quiz.created',
  );

  return quiz;
});
