/**
 * GET /api/cursus/:id/modules — liste les modules d'un cursus, triés par semaine.
 *
 * - Cursus PUBLISHED : tout utilisateur authentifié peut lire les modules.
 * - Cursus DRAFT / ARCHIVED : propriétaire ou admin seulement.
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
      select: { id: true, ownerId: true, status: true },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (cursus.status !== 'PUBLISHED' && !isAdmin && !isOwner) {
    logger.warn(
      { cursusId, cursusStatus: cursus.status, userIdHash: hashId(supabaseUser['id']) },
      'module.list.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  const modules = await prisma.module.findMany({
    where: { cursusId },
    orderBy: { week: 'asc' },
    select: {
      id: true,
      cursusId: true,
      week: true,
      title: true,
      objectives: true,
      resourcesJson: true,
      deliverableSpecJson: true,
      xpReward: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return modules;
});
