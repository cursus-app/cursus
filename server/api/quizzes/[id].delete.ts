/**
 * DELETE /api/quizzes/:id — suppression d'un quiz.
 *
 * Autorisé pour :
 *  - ADMIN : tous les quiz.
 *  - FORMATEUR_PRINCIPAL / CO_FORMATEUR : uniquement si propriétaire du cursus du quiz.
 *
 * Bloqué si le quiz a des tentatives existantes (409).
 * Désassociation du module effectuée explicitement avant suppression.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing quiz id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`quiz:delete:${supabaseUser['id']}`, 30, 60 * 60 * 1_000);

  // Récupérer user et quiz en parallèle.
  const [dbUser, quiz] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        module: {
          select: {
            id: true,
            cursus: { select: { ownerId: true } },
          },
        },
        _count: { select: { attempts: true } },
      },
    }),
  ]);

  if (!quiz) {
    throw createError({ statusCode: 404, message: 'quiz.errors.notFound' });
  }

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Autorisation : ADMIN toujours autorisé, sinon propriétaire du cursus.
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isCursusOwner = quiz.module?.cursus?.ownerId === dbUser.id;

  if (!isAdmin && !isCursusOwner) {
    logger.warn(
      { quizId: id, userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'quiz.delete.forbidden',
    );
    throw createError({ statusCode: 403, message: 'quiz.errors.forbidden' });
  }

  // Bloquer si des tentatives existent.
  const attemptCount = quiz._count.attempts;

  if (attemptCount > 0) {
    logger.warn(
      { quizId: id, attemptCount, userIdHash: hashId(dbUser.id) },
      'quiz.delete.blockedByAttempts',
    );
    throw createError({
      statusCode: 409,
      message: 'quiz.errors.deleteBlockedByAttempts',
      data: { attemptCount },
    });
  }

  // Désassocier le module explicitement avant suppression.
  if (quiz.module) {
    await prisma.module.update({
      where: { quizId: id },
      data: { quizId: null },
    });
  }

  await prisma.quiz.delete({ where: { id } });

  logger.info({ quizId: id, userIdHash: hashId(dbUser.id) }, 'quiz.deleted');

  return { success: true };
});
