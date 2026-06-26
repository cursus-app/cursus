/**
 * GET /api/cohortes/:id/invitations — liste des invitations d'une cohorte.
 *
 * Retourne uniquement les invitations non acceptées (status "INVITED").
 * Affiche aussi l'état des invitations expirées pour permettre le renvoi.
 *
 * Auth : FORMATEUR_PRINCIPAL (global ou dans la cohorte) ou ADMIN.
 *
 * Cf. ST-04.2 — TT-04.2.3 (affichage dans la page cohorte).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const cohorteId = getRouterParam(event, 'id');

  if (!cohorteId) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`invitations:list:${supabaseUser['id']}`, 60, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Auth : ADMIN ou FORMATEUR_PRINCIPAL (global ou dans la cohorte)
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isGlobalFormateur = dbUser.globalRole === 'FORMATEUR_PRINCIPAL';

  if (!isAdmin && !isGlobalFormateur) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        cohorteId,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
      select: { id: true },
    });
    if (!membership) {
      logger.warn(
        { userIdHash: hashId(dbUser.id), cohorteId },
        'invitation.list.forbidden',
      );
      throw createError({ statusCode: 403, message: 'invitations.errors.forbidden' });
    }
  }

  // Vérifier que la cohorte existe
  const cohorte = await prisma.cohorte.findUnique({
    where: { id: cohorteId },
    select: { id: true },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  // Retourner les invitations non acceptées (tri : les plus récentes d'abord)
  const invitations = await prisma.invitation.findMany({
    where: { cohorteId, acceptedAt: null, revokedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      cohorteId: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations;
});
