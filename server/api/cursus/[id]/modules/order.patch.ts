/**
 * PATCH /api/cursus/:id/modules/order — réordonnancement en masse des modules.
 *
 * Body : { modules: [{ id, week }] }
 * - Les semaines fournies doivent être uniques entre elles.
 * - Tous les IDs doivent appartenir au cursus.
 * - Cursus doit être en statut DRAFT.
 * - Réservé au propriétaire ou à un admin.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { moduleBulkOrderSchema } from '~~/shared/schemas/module';
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

  checkRateLimit(`module:order:${supabaseUser['id']}`, 120, 60 * 60 * 1_000);

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
    logger.warn({ cursusId, userIdHash: hashId(supabaseUser['id']) }, 'module.order.forbidden');
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cursus.errors.cannotEditArchived' });
  }

  const body = await readValidatedBody(event, (raw) => moduleBulkOrderSchema.parse(raw));

  // Vérifier l'unicité des semaines dans le payload.
  const weeks = body.modules.map((m) => m.week);
  const uniqueWeeks = new Set(weeks);
  if (uniqueWeeks.size !== weeks.length) {
    throw createError({ statusCode: 422, message: 'modules.errors.duplicateWeeks' });
  }

  // Vérifier que tous les IDs appartiennent bien à ce cursus.
  const existingModules = await prisma.module.findMany({
    where: { cursusId, id: { in: body.modules.map((m) => m.id) } },
    select: { id: true },
  });

  if (existingModules.length !== body.modules.length) {
    throw createError({ statusCode: 422, message: 'modules.errors.invalidModuleIds' });
  }

  // Mise à jour atomique en transaction.
  await prisma.$transaction(
    body.modules.map((m) =>
      prisma.module.update({
        where: { id: m.id },
        data: { week: m.week },
      }),
    ),
  );

  logger.info(
    {
      cursusId,
      count: body.modules.length,
      userIdHash: hashId(supabaseUser['id']),
    },
    'module.reordered',
  );

  // Retourner la liste mise à jour.
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
