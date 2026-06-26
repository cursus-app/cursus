/**
 * POST /api/cursus/:id/archive — archivage d'un cursus publié.
 *
 * Le cursus doit être en statut PUBLISHED.
 * Les cohortes existantes conservent leur accès en lecture (via CursusVersion).
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

  checkRateLimit(`cursus:archive:${supabaseUser['id']}`, 20, 60 * 60 * 1_000);

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

  if (cursus.status !== 'PUBLISHED') {
    throw createError({
      statusCode: 422,
      message: 'cursus.errors.mustBePublishedToArchive',
    });
  }

  const updated = await prisma.cursus.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  logger.info(
    { cursusId: id, userIdHash: hashId(supabaseUser['id']) },
    'cursus.archived',
  );

  return updated;
});
