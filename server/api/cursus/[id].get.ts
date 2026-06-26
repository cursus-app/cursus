/**
 * GET /api/cursus/:id — détail d'un cursus.
 *
 * - Cursus PUBLISHED : accessible publiquement (auth non requise).
 * - Cursus DRAFT / ARCHIVED : propriétaire ou admin seulement.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  const cursus = await prisma.cursus.findUnique({
    where: { id },
    include: {
      _count: { select: { modules: true, versions: true } },
      versions: {
        orderBy: { version: 'desc' },
        take: 5,
        select: { id: true, version: true, publishedAt: true },
      },
    },
  });

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  // Les cursus publiés sont publics.
  if (cursus.status === 'PUBLISHED') {
    return cursus;
  }

  // Pour les brouillons et archivés, vérifier l'identité.
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    logger.warn(
      {
        cursusId: id,
        cursusStatus: cursus.status,
        userIdHash: supabaseUser ? hashId(supabaseUser['id']) : 'anonymous',
      },
      'cursus.get.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  return cursus;
});
