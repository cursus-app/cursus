/**
 * PATCH /api/alerts/:id/resolve — marque une alerte comme résolue.
 *
 * Auth : FORMATEUR_PRINCIPAL ou CO_FORMATEUR uniquement.
 * RLS  : le formateur peut uniquement résoudre des alertes de ses cohortes.
 *
 * ST-08.3 — TT-08.3.3
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const isFormateur =
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' || dbUser.globalRole === 'CO_FORMATEUR';

  if (!isFormateur && dbUser.globalRole !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Forbidden — formateur only' });
  }

  const alertId = getRouterParam(event, 'id');
  if (!alertId) {
    throw createError({ statusCode: 400, message: 'Missing alert id' });
  }

  // Charger l'alerte pour vérifier qu'elle appartient à une cohorte du formateur
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      resolvedAt: true,
      userId: true,
    },
  });

  if (!alert) {
    throw createError({ statusCode: 404, message: 'Alert not found' });
  }

  if (alert.resolvedAt !== null) {
    throw createError({ statusCode: 409, message: 'Alert already resolved' });
  }

  // Vérifier que le stagiaire est dans une cohorte du formateur (RLS)
  if (dbUser.globalRole !== 'ADMIN') {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: dbUser.id,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
      select: { cohorteId: true },
    });

    const cohorteIds = memberships.map((m) => m.cohorteId);

    if (cohorteIds.length === 0) {
      throw createError({ statusCode: 403, message: 'Forbidden' });
    }

    // Vérifier que le stagiaire (alert.userId) est dans une cohorte du formateur
    const stagiaireMembership = await prisma.membership.findFirst({
      where: {
        userId: alert.userId,
        cohorteId: { in: cohorteIds },
        role: 'STAGIAIRE',
      },
    });

    if (!stagiaireMembership) {
      throw createError({ statusCode: 403, message: 'Forbidden — alert not in your cohorts' });
    }
  }

  const resolved = await prisma.alert.update({
    where: { id: alertId },
    data: {
      resolvedAt: new Date(),
      resolvedById: dbUser.id,
    },
    select: {
      id: true,
      kind: true,
      severity: true,
      resolvedAt: true,
      resolvedById: true,
    },
  });

  logger.info(
    { uid: hashId(dbUser.id), alertId, targetUid: hashId(alert.userId) },
    'alert.resolved',
  );

  return resolved;
});
