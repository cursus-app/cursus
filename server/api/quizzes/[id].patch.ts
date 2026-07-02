/**
 * PATCH /api/quizzes/:id — mise à jour partielle d'un quiz.
 *
 * Réservé aux formateurs principaux et aux admins.
 * Warning logué si le quiz a déjà des tentatives (impact potentiel sur les scores).
 */
import { serverSupabaseUser } from '#supabase/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { updateQuizSchema } from '~~/shared/schemas/quiz';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing quiz id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`quiz:patch:${supabaseUser['id']}`, 120, 60 * 60 * 1_000);

  const [dbUser, quiz] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.quiz.findUnique({
      where: { id },
      select: { id: true, module: { select: { cursus: { select: { ownerId: true } } } } },
    }),
  ]);

  if (!quiz) {
    throw createError({ statusCode: 404, message: 'quiz.errors.notFound' });
  }

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isCursusOwner = quiz.module?.cursus?.ownerId === dbUser.id;
  const isAllowed = isAdmin || (dbUser.globalRole === 'FORMATEUR_PRINCIPAL' && isCursusOwner);

  if (!isAllowed) {
    logger.warn(
      { quizId: id, userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'quiz.patch.forbidden',
    );
    throw createError({ statusCode: 403, message: 'quiz.errors.forbidden' });
  }

  // Compter les tentatives existantes.
  const attemptCount = await prisma.quizAttempt.count({ where: { quizId: id } });

  if (attemptCount > 0) {
    logger.warn(
      { quizId: id, attemptCount, userIdHash: hashId(dbUser.id) },
      'quiz.update.existingAttempts',
    );
  }

  const body = await readValidatedBody(event, (raw) => updateQuizSchema.parse(raw));

  const data: {
    title?: string;
    questionsJson?: Prisma.InputJsonValue;
    passingScore?: number;
    randomize?: boolean;
  } = {};

  if (body.title !== undefined) {
    data.title = body.title;
  }
  if (body.questions !== undefined) {
    data.questionsJson = body.questions as unknown as Prisma.InputJsonValue;
  }
  if (body.passingScore !== undefined) {
    data.passingScore = body.passingScore;
  }
  if (body.randomize !== undefined) {
    data.randomize = body.randomize;
  }

  const { questionsJson: updatedQuestionsJson, ...updatedRest } = await prisma.quiz.update({
    where: { id },
    data,
  });

  logger.info({ quizId: id, userIdHash: hashId(dbUser.id), attemptCount }, 'quiz.updated');

  return { ...updatedRest, questions: updatedQuestionsJson };
});
