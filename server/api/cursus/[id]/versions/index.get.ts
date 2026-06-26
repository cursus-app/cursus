/**
 * GET /api/cursus/:id/versions — liste les versions d'un cursus (ordre desc).
 *
 * Auth requise : propriétaire du cursus ou ADMIN.
 * Retourne : [{ id, version, publishedAt, moduleCount }]
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');

  if (!cursusId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
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
      { cursusId, userIdHash: hashId(supabaseUser['id']) },
      'cursus.versions.list.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  const versions = await prisma.cursusVersion.findMany({
    where: { cursusId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, publishedAt: true, snapshotJson: true },
  });

  logger.info(
    { cursusId, count: versions.length, userIdHash: hashId(supabaseUser['id']) },
    'cursus.versions.listed',
  );

  return versions.map((v) => {
    const snapshot = v.snapshotJson as { modules?: unknown[] };
    return {
      id: v.id,
      version: v.version,
      publishedAt: v.publishedAt,
      moduleCount: Array.isArray(snapshot?.modules) ? snapshot.modules.length : 0,
    };
  });
});
