/**
 * POST /api/cohortes/:id/archive — transition manuelle vers ARCHIVED.
 *
 * Réservé au formateur ou à un admin.
 * Disponible depuis COMPLETED (ou ACTIVE si l'admin force).
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

  checkRateLimit(`cohortes:archive:${supabaseUser['id']}`, 20, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isFormateur =
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' || dbUser.globalRole === 'CO_FORMATEUR';

  if (!isAdmin && !isFormateur) {
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  if (cohorte.status === 'ARCHIVED') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.alreadyArchived' });
  }

  if (cohorte.status === 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.cannotArchiveDraft' });
  }

  const updated = await prisma.cohorte.update({
    where: { id },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  });

  logger.info(
    { cohorteId: id, userIdHash: hashId(dbUser.id), previousStatus: cohorte.status },
    'cohorte.archived',
  );

  return updated;
});
