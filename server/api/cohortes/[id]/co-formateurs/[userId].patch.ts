/**
 * PATCH /api/cohortes/:id/co-formateurs/:userId
 *
 * Met à jour les modules assignés à un co-formateur.
 * Body : { moduleIds: string[] | null }
 *   - null → accès global
 *   - string[] → accès limité aux modules listés
 *
 * Auth : FORMATEUR_PRINCIPAL de la cohorte ou ADMIN.
 * Cf. ST-04.3 — TT-04.3.1
 */
import { Prisma } from '@prisma/client';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { coFormateurUpdateSchema } from '~~/shared/schemas/cohorte';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const userId = getRouterParam(event, 'userId');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }
  if (!userId) {
    throw createError({ statusCode: 400, message: 'Missing userId' });
  }

  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:co-formateurs:update:${supabaseUser['id']}`, 30, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Vérifier autorisation : ADMIN ou FORMATEUR_PRINCIPAL de la cohorte
  const isAdmin = dbUser.globalRole === 'ADMIN';

  if (!isAdmin) {
    const actorMembership = await prisma.membership.findUnique({
      where: { userId_cohorteId: { userId: dbUser.id, cohorteId: id } },
      select: { role: true },
    });
    if (actorMembership?.role !== 'FORMATEUR_PRINCIPAL') {
      logger.warn(
        { cohorteId: id, userIdHash: hashId(dbUser.id) },
        'cohorte.co_formateur.update.forbidden',
      );
      throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
    }
  }

  // Vérifier que la cible est bien un CO_FORMATEUR dans cette cohorte
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_cohorteId: { userId, cohorteId: id } },
    select: { id: true, role: true },
  });

  if (!targetMembership) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.coFormateurNotFound' });
  }

  if (targetMembership.role !== 'CO_FORMATEUR') {
    throw createError({ statusCode: 409, message: 'cohortes.errors.notCoFormateur' });
  }

  const body = await readValidatedBody(event, (raw) => coFormateurUpdateSchema.parse(raw));

  // Prisma.DbNull est requis pour stocker NULL explicitement dans un champ Json?
  const moduleIdsValue: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    body.moduleIds === null ? Prisma.DbNull : body.moduleIds;

  const updated = await prisma.membership.update({
    where: { userId_cohorteId: { userId, cohorteId: id } },
    data: {
      moduleIds: moduleIdsValue,
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true, githubHandle: true },
      },
    },
  });

  logger.info(
    {
      cohorteId: id,
      actorIdHash: hashId(dbUser.id),
      targetIdHash: hashId(userId),
      isGlobal: body.moduleIds === null,
      moduleCount: Array.isArray(body.moduleIds) ? body.moduleIds.length : null,
    },
    'cohorte.co_formateur.updated',
  );

  return updated;
});
