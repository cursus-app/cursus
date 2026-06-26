/**
 * GET /api/cohortes — liste des cohortes pour le formateur authentifié.
 * Inclut la relation cursusVersion.cursus pour l'affichage.
 * Filtre par statut si le param `status` est fourni.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { listCohortesQuerySchema } from '~~/shared/schemas/cohorte';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:list:${supabaseUser['id']}`, 60, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const query = await getValidatedQuery(event, (raw) => listCohortesQuerySchema.parse(raw));
  const { page, limit, status } = query;
  const skip = (page - 1) * limit;

  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isFormateur =
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' || dbUser.globalRole === 'CO_FORMATEUR';

  // Formateurs et admins voient les cohortes. Stagiaires voient les leurs via memberships.
  type CohorteWhere = NonNullable<Parameters<typeof prisma.cohorte.findMany>[0]>['where'];
  const conditions: NonNullable<CohorteWhere>[] = [];

  if (!isAdmin && !isFormateur) {
    // Stagiaire : uniquement les cohortes où il est membre
    conditions.push({
      memberships: {
        some: { userId: dbUser.id },
      },
    });
  }

  if (status) {
    conditions.push({ status });
  }

  const where: NonNullable<CohorteWhere> =
    conditions.length === 0
      ? {}
      : conditions.length === 1
        ? (conditions[0] ?? {})
        : { AND: conditions };

  const [total, data] = await Promise.all([
    prisma.cohorte.count({ where }),
    prisma.cohorte.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        rhythm: true,
        status: true,
        createdAt: true,
        cursusVersion: {
          select: {
            id: true,
            version: true,
            cursus: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        _count: { select: { memberships: true } },
      },
    }),
  ]);

  logger.info({ page, limit, total, userIdHash: hashId(dbUser.id) }, 'cohortes.list');

  return { data, total, page, limit };
});
