/**
 * POST /api/cursus/:id/modules — création d'un nouveau module.
 *
 * - Réservé au propriétaire ou à un admin.
 * - Cursus doit être en statut DRAFT.
 * - Si `week` n'est pas fourni, il est auto-incrémenté (max(existing) + 1).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { moduleSchema } from '~~/shared/schemas/module';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');

  if (!cursusId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`module:create:${supabaseUser['id']}`, 120, 60 * 60 * 1_000);

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

  if (!isAdmin && !isOwner) {
    logger.warn({ cursusId, userIdHash: hashId(supabaseUser['id']) }, 'module.create.forbidden');
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cursus.errors.cannotEditArchived' });
  }

  const body = await readValidatedBody(event, (raw) => moduleSchema.parse(raw));

  // Auto-incrémenter la semaine si non fournie.
  let week = body.week;
  if (week === undefined) {
    const lastModule = await prisma.module.findFirst({
      where: { cursusId },
      orderBy: { week: 'desc' },
      select: { week: true },
    });
    week = lastModule ? lastModule.week + 1 : 1;
  }

  // Vérifier l'unicité de la semaine dans ce cursus.
  const weekConflict = await prisma.module.findFirst({
    where: { cursusId, week },
    select: { id: true },
  });
  if (weekConflict) {
    throw createError({ statusCode: 409, message: 'modules.errors.weekTaken' });
  }

  const module = await prisma.module.create({
    data: {
      cursusId,
      week,
      title: body.title,
      objectives: body.objectives,
      resourcesJson: body.resourcesJson,
      deliverableSpecJson: body.deliverableSpecJson,
      xpReward: body.xpReward,
    },
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

  logger.info(
    { moduleId: hashId(module.id), cursusId, userIdHash: hashId(supabaseUser['id']) },
    'module.created',
  );

  return module;
});
