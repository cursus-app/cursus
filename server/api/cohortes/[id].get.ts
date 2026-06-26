/**
 * GET /api/cohortes/:id — détail d'une cohorte.
 * Inclut les memberships + cursusVersion.cursus.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { hashId } from '~~/server/utils/hash';
import { logger } from '~~/server/utils/logger';
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

  checkRateLimit(`cohortes:get:${supabaseUser['id']}`, 60, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    include: {
      cursusVersion: {
        include: {
          cursus: {
            select: { id: true, title: true, slug: true, domain: true },
          },
        },
      },
      memberships: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true, githubHandle: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { memberships: true } },
    },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  // Vérifier l'accès : admin, formateur ou membre de la cohorte
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isFormateur =
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' || dbUser.globalRole === 'CO_FORMATEUR';
  const isMember = cohorte.memberships.some((m) => m.userId === dbUser.id);

  if (!isAdmin && !isFormateur && !isMember) {
    logger.warn({ cohorteId: id, userIdHash: hashId(dbUser.id) }, 'cohorte.get.forbidden');
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  return cohorte;
});
