/**
 * POST /api/cohortes/:id/complete — transition ACTIVE → COMPLETED.
 *
 * Réservé au formateur ou à un admin.
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

  checkRateLimit(`cohortes:complete:${supabaseUser['id']}`, 20, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const isAdmin = dbUser.globalRole === 'ADMIN';

  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      memberships: {
        where: { userId: dbUser.id, role: 'FORMATEUR_PRINCIPAL' },
        select: { userId: true },
      },
    },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const isOwner = cohorte.memberships.length > 0;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  if (cohorte.status !== 'ACTIVE') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.cannotCompleteNonActive' });
  }

  const updated = await prisma.cohorte.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });

  logger.info({ cohorteId: id, userIdHash: hashId(dbUser.id) }, 'cohorte.completed');

  return updated;
});
