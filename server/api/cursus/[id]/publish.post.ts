/**
 * POST /api/cursus/:id/publish — publication d'un cursus brouillon.
 *
 * Prérequis :
 *  - Cursus en statut DRAFT.
 *  - Au moins 1 module existant.
 *
 * Effets :
 *  - Crée une CursusVersion (snapshot JSON).
 *  - Passe le cursus en PUBLISHED (atomic — updateMany conditionnel dans la transaction).
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

  checkRateLimit(`cursus:publish:${supabaseUser['id']}`, 20, 60 * 60 * 1_000);

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
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true },
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
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.modules.length === 0) {
    throw createError({
      statusCode: 422,
      message: 'cursus.errors.noModulesForPublish',
    });
  }

  const latestVersion = cursus.versions[0];
  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  const snapshotJson = {
    id: cursus.id,
    title: cursus.title,
    slug: cursus.slug,
    domain: cursus.domain,
    level: cursus.level,
    durationWeeks: cursus.durationWeeks,
    description: cursus.description,
    prerequisites: cursus.prerequisites,
    publishedAt: new Date().toISOString(),
    modules: cursus.modules,
  };

  // Atomic: updateMany with WHERE status='DRAFT' acts as an optimistic lock.
  // If two concurrent requests both pass the module check above, only one will
  // update the row (PostgreSQL row-level lock); the second will find count=0
  // and receive a 422 instead of a P2002 crash on the unique constraint.
  const updatedCursus = await prisma.$transaction(async (tx) => {
    const result = await tx.cursus.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'PUBLISHED' },
    });

    if (result.count === 0) {
      throw createError({
        statusCode: 422,
        message: 'cursus.errors.mustBeDraftToPublish',
      });
    }

    await tx.cursusVersion.create({
      data: {
        cursusId: id,
        version: nextVersion,
        snapshotJson,
        publishedAt: new Date(),
      },
    });

    return tx.cursus.findUniqueOrThrow({ where: { id } });
  });

  logger.info(
    {
      cursusId: id,
      version: nextVersion,
      userIdHash: hashId(supabaseUser['id']),
    },
    'cursus.published',
  );

  return updatedCursus;
});
