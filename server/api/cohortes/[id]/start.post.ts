/**
 * POST /api/cohortes/:id/start — transition DRAFT → ACTIVE.
 *
 * Pré-conditions :
 *  - au moins 1 membership avec role STAGIAIRE
 *  - au moins 1 membership avec role FORMATEUR_PRINCIPAL
 * Sinon : 422 avec message descriptif.
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

  checkRateLimit(`cohortes:start:${supabaseUser['id']}`, 20, 60 * 1_000);

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
    include: {
      memberships: {
        select: { role: true, userId: true },
      },
    },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  if (cohorte.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.cannotStartNonDraft' });
  }

  // Vérifier les pré-conditions
  const hasStagiaire = cohorte.memberships.some((m) => m.role === 'STAGIAIRE');
  const hasFormateur = cohorte.memberships.some((m) => m.role === 'FORMATEUR_PRINCIPAL');

  if (!hasStagiaire && !hasFormateur) {
    throw createError({
      statusCode: 422,
      message: 'cohortes.errors.noStagiaires',
      data: { missingRoles: ['STAGIAIRE', 'FORMATEUR_PRINCIPAL'] },
    });
  }

  if (!hasStagiaire) {
    throw createError({
      statusCode: 422,
      message: 'cohortes.errors.noStagiaires',
      data: { missingRoles: ['STAGIAIRE'] },
    });
  }

  if (!hasFormateur) {
    throw createError({
      statusCode: 422,
      message: 'cohortes.errors.noFormateur',
      data: { missingRoles: ['FORMATEUR_PRINCIPAL'] },
    });
  }

  const updated = await prisma.cohorte.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });

  logger.info({ cohorteId: id, userIdHash: hashId(dbUser.id) }, 'cohorte.started');

  return updated;
});
