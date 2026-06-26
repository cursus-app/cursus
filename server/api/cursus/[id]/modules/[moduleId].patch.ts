/**
 * PATCH /api/cursus/:id/modules/:moduleId — mise à jour d'un module.
 *
 * - Réservé au propriétaire ou à un admin.
 * - Cursus doit être en statut DRAFT.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { updateModuleSchema } from '~~/shared/schemas/module';
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

  checkRateLimit(`module:patch:${supabaseUser['id']}`, 300, 60 * 60 * 1_000);

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
      select: { id: true, week: true },
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
      'module.patch.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cursus.errors.cannotEditArchived' });
  }

  const body = await readValidatedBody(event, (raw) => updateModuleSchema.parse(raw));

  // Si la semaine change, vérifier l'unicité.
  if (body.week !== undefined && body.week !== existingModule.week) {
    const weekConflict = await prisma.module.findFirst({
      where: { cursusId, week: body.week, id: { not: moduleId } },
      select: { id: true },
    });
    if (weekConflict) {
      throw createError({ statusCode: 409, message: 'modules.errors.weekTaken' });
    }
  }

  // Construire l'objet de mise à jour avec uniquement les champs fournis.
  // Pas de champs optionnels (exactOptionalPropertyTypes) — on utilise le spread conditionnel.
  const data = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.week !== undefined && { week: body.week }),
    ...(body.objectives !== undefined && { objectives: body.objectives }),
    ...(body.resourcesJson !== undefined && { resourcesJson: body.resourcesJson }),
    ...(body.deliverableSpecJson !== undefined && {
      deliverableSpecJson: body.deliverableSpecJson,
    }),
    ...(body.xpReward !== undefined && { xpReward: body.xpReward }),
  };

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data,
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
    { moduleId: hashId(moduleId), cursusId, userIdHash: hashId(supabaseUser['id']) },
    'module.updated',
  );

  return updated;
});
