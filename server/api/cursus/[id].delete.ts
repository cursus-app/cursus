/**
 * DELETE /api/cursus/:id — suppression d'un cursus.
 *
 * Bloqué si des Cohortes référencent ce cursus (via CursusVersion).
 * Réservé au propriétaire ou à un admin.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cursus:delete:${supabaseUser['id']}`, 30, 60 * 60 * 1_000);

  const [dbUser, cursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  // Vérifier qu'aucune Cohorte ne référence ce cursus via une CursusVersion.
  const cohorteCount = await prisma.cohorte.count({
    where: {
      cursusVersion: {
        cursusId: id,
      },
    },
  });

  if (cohorteCount > 0) {
    logger.warn(
      { cursusId: id, cohorteCount, userIdHash: hashId(supabaseUser['id']) },
      'cursus.delete_blocked',
    );
    throw createError({
      statusCode: 409,
      message: 'cursus.errors.deleteBlockedByCohortes',
      data: { count: cohorteCount },
    });
  }

  await prisma.cursus.delete({ where: { id } });

  logger.info({ cursusId: id, userIdHash: hashId(supabaseUser['id']) }, 'cursus.deleted');

  return { success: true };
});
