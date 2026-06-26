/**
 * DELETE /api/cohortes/:id/co-formateurs/:userId
 *
 * Retire un co-formateur de la cohorte (supprime le membership).
 * Auth : FORMATEUR_PRINCIPAL de la cohorte ou ADMIN.
 * Cf. ST-04.3 — TT-04.3.1
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

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

  checkRateLimit(`cohortes:co-formateurs:remove:${supabaseUser['id']}`, 30, 60 * 1_000);

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
        'cohorte.co_formateur.remove.forbidden',
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

  await prisma.membership.delete({
    where: { userId_cohorteId: { userId, cohorteId: id } },
  });

  logger.info(
    { cohorteId: id, actorIdHash: hashId(dbUser.id), targetIdHash: hashId(userId) },
    'cohorte.co_formateur.removed',
  );

  return { success: true };
});
