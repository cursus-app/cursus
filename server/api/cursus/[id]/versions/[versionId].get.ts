/**
 * GET /api/cursus/:id/versions/:versionId — snapshot complet d'une version.
 *
 * Auth requise : propriétaire du cursus ou ADMIN.
 * Retourne : le record CursusVersion complet, incluant snapshotJson.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');
  const versionId = getRouterParam(event, 'versionId');

  if (!cursusId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  if (!versionId) {
    throw createError({ statusCode: 400, message: 'Missing version id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const [dbUser, cursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id: cursusId },
      select: { id: true, ownerId: true },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    logger.warn(
      { cursusId, versionId, userIdHash: hashId(supabaseUser['id']) },
      'cursus.version.get.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  const version = await prisma.cursusVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.cursusId !== cursusId) {
    throw createError({ statusCode: 404, message: 'cursus.errors.versionNotFound' });
  }

  logger.info(
    { cursusId, versionId, userIdHash: hashId(supabaseUser['id']) },
    'cursus.version.fetched',
  );

  return version;
});
