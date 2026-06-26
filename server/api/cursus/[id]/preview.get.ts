/**
 * GET /api/cursus/:id/preview — cursus + modules pour la prévisualisation stagiaire.
 *
 * Cf. ST-03.8 — TT-03.8.1.
 *
 * Accès réservé au propriétaire du cursus ou à un admin.
 * La prévisualisation est une vue formateur uniquement, même pour un cursus PUBLISHED.
 * Endpoint read-only : aucune écriture en DB.
 *
 * Observabilité : log `cursus.preview_opened` à chaque ouverture (ST-03.8).
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

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'cursus.errors.forbidden' });
  }

  const [dbUser, cursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { week: 'asc' },
          select: {
            id: true,
            week: true,
            title: true,
            objectives: true,
            resourcesJson: true,
            deliverableSpecJson: true,
            xpReward: true,
          },
        },
      },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    logger.warn(
      {
        cursusId: id,
        userIdHash: hashId(supabaseUser['id']),
      },
      'cursus.preview.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  logger.info(
    {
      cursusId: id,
      userIdHash: hashId(supabaseUser['id']),
      moduleCount: cursus.modules.length,
    },
    'cursus.preview_opened',
  );

  return {
    id: cursus.id,
    title: cursus.title,
    slug: cursus.slug,
    domain: cursus.domain,
    level: cursus.level,
    durationWeeks: cursus.durationWeeks,
    description: cursus.description,
    prerequisites: cursus.prerequisites,
    status: cursus.status,
    modules: cursus.modules,
  };
});
