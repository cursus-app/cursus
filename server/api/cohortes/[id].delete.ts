/**
 * DELETE /api/cohortes/:id — suppression d'une cohorte.
 *
 * Bloqué si le statut n'est pas DRAFT (409 avec message clair).
 * Réservé au formateur principal ou à un admin.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:delete:${supabaseUser['id']}`, 20, 60 * 1_000);

  const [dbUser, cohorte] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cohorte.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        name: true,
        memberships: {
          where: { role: 'FORMATEUR_PRINCIPAL' },
          select: { userId: true },
        },
      },
    }),
  ]);

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwnerFormateur = cohorte.memberships.some((m) => m.userId === dbUser?.id);

  if (!isAdmin && !isOwnerFormateur) {
    logger.warn(
      { cohorteId: id, userIdHash: hashId(supabaseUser['id']) },
      'cohorte.delete.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  if (cohorte.status !== 'DRAFT') {
    logger.warn(
      { cohorteId: id, status: cohorte.status, userIdHash: hashId(supabaseUser['id']) },
      'cohorte.delete.blocked',
    );
    throw createError({ statusCode: 409, message: 'cohortes.errors.cannotDeleteActive' });
  }

  await prisma.cohorte.delete({ where: { id } });

  logger.info({ cohorteId: id, userIdHash: hashId(supabaseUser['id']) }, 'cohorte.deleted');

  return { success: true };
});
