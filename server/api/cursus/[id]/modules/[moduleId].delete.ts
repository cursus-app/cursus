/**
 * DELETE /api/cursus/:id/modules/:moduleId — suppression d'un module.
 *
 * - Réservé au propriétaire ou à un admin.
 * - Cursus doit être en statut DRAFT.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');
  const moduleId = getRouterParam(event, 'moduleId');

  if (!cursusId || !moduleId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id or module id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`module:delete:${supabaseUser['id']}`, 60, 60 * 60 * 1_000);

  const [dbUser, cursus, existingModule] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id: cursusId },
      select: { id: true, ownerId: true, status: true },
    }),
    prisma.module.findFirst({
      where: { id: moduleId, cursusId },
      select: { id: true },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  if (!existingModule) {
    throw createError({ statusCode: 404, message: 'modules.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    logger.warn(
      { cursusId, moduleId: hashId(moduleId), userIdHash: hashId(supabaseUser['id']) },
      'module.delete.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cursus.errors.cannotEditArchived' });
  }

  await prisma.module.delete({ where: { id: moduleId } });

  logger.info(
    { moduleId: hashId(moduleId), cursusId, userIdHash: hashId(supabaseUser['id']) },
    'module.deleted',
  );

  return { success: true };
});
