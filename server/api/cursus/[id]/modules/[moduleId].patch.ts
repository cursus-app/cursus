/**
 * PATCH /api/cursus/:id/modules/:moduleId — mise à jour d'un module.
 *
 * Permet de mettre à jour les ressources, le titre, la semaine, les objectifs
 * et la récompense XP d'un module.
 *
 * Réservé au propriétaire du cursus ou à un admin.
 * Limité à 100 requêtes par formateur par heure.
 * Max 20 ressources par module.
 *
 * Cf. ST-03.3 — Gestion ressources d'un module.
 */
import { serverSupabaseUser } from '#supabase/server';
import { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { updateModuleSchema } from '~~/shared/schemas/module';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');
  const moduleId = getRouterParam(event, 'moduleId');

  if (!cursusId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }
  if (!moduleId) {
    throw createError({ statusCode: 400, message: 'Missing module id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Rate limit : 100 mise à jour / formateur / heure
  checkRateLimit(`module:patch:${supabaseUser['id']}`, 100, 60 * 60 * 1_000);

  const [dbUser, module_] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        cursusId: true,
        cursus: { select: { ownerId: true } },
      },
    }),
  ]);

  if (!module_) {
    throw createError({ statusCode: 404, message: 'module.errors.notFound' });
  }

  // Vérifier que le module appartient bien au cursus demandé
  if (module_.cursusId !== cursusId) {
    throw createError({ statusCode: 404, message: 'module.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === module_.cursus.ownerId;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'module.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => updateModuleSchema.parse(raw));

  // Construire le payload de mise à jour (champs fournis uniquement)
  const data: {
    title?: string;
    week?: number;
    objectives?: string;
    resourcesJson?: Prisma.InputJsonValue;
    deliverableSpecJson?: Prisma.InputJsonValue;
    xpReward?: number;
  } = {};

  if (body.title !== undefined) {
    data.title = body.title;
  }
  if (body.week !== undefined) {
    data.week = body.week;
  }
  if (body.objectives !== undefined) {
    data.objectives = body.objectives;
  }
  if (body.resources !== undefined) {
    data.resourcesJson = body.resources as unknown as Prisma.InputJsonValue;
  }
  if (body.deliverableSpecJson !== undefined) {
    data.deliverableSpecJson = body.deliverableSpecJson as unknown as Prisma.InputJsonValue;
  }
  if (body.xpReward !== undefined) {
    data.xpReward = body.xpReward;
  }

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
    {
      moduleId: hashId(moduleId),
      cursusId,
      userIdHash: hashId(supabaseUser['id']),
      ...(body.resources !== undefined && { resourceCount: body.resources.length }),
    },
    'module.updated',
  );

  return updated;
});
