/**
 * GET /api/me/alerts — liste paginée des alertes pour les cohortes du formateur.
 *
 * Query params:
 *   - kind?: 'all' | AlertKind  (défaut: 'all')
 *   - status?: 'open' | 'resolved'  (défaut: 'open')
 *   - search?: string  (nom du stagiaire)
 *   - page?: number  (défaut: 1)
 *
 * Auth : FORMATEUR_PRINCIPAL ou CO_FORMATEUR uniquement.
 * RLS  : uniquement les alertes des stagiaires dans les cohortes du formateur.
 *
 * ST-08.3 — TT-08.3.1
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

const AlertKindEnum = z.enum([
  'SUBMISSION_LATE',
  'QUIZ_REPEATEDLY_FAILED',
  'SUBMISSION_REPEATEDLY_FAILED',
  'STAGIAIRE_BLOCKED',
  'PROGRESS_STALLED',
  'CAPSTONE_OVERDUE',
]);

const QuerySchema = z.object({
  kind: z.union([z.literal('all'), AlertKindEnum]).default('all'),
  status: z.enum(['open', 'resolved']).default('open'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

const PER_PAGE = 20;

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

  const rawQuery = getQuery(event);
  const parsed = QuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query parameters' });
  }

  const { kind, status, search, page } = parsed.data;
  const skip = (page - 1) * PER_PAGE;

  // Récupérer les cohortes où l'utilisateur est formateur (scoping RLS)
  const memberships = await prisma.membership.findMany({
    where: {
      userId: dbUser.id,
      role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
    },
    select: { cohorteId: true, moduleIds: true, role: true },
  });

  const cohorteIds = memberships.map((m) => m.cohorteId);

  if (cohorteIds.length === 0) {
    return {
      data: [],
      meta: { total: 0, page, perPage: PER_PAGE, totalPages: 0 },
    };
  }

  // Pour CO_FORMATEUR avec moduleIds restreints : récupérer les userId concernés
  // via les progressions liées à ces modules dans leurs cohortes.
  // Pour FORMATEUR_PRINCIPAL : tous les stagiaires des cohortes.
  let stagiaireuserIds: string[] | undefined;

  const coFormateurMemberships = memberships.filter(
    (m) => m.role === 'CO_FORMATEUR' && m.moduleIds !== null,
  );

  if (coFormateurMemberships.length > 0 && dbUser.globalRole === 'CO_FORMATEUR') {
    // CO_FORMATEUR scoped : collecter les userIds via CohortModule
    const scopedModuleIds: string[] = [];
    for (const m of coFormateurMemberships) {
      if (Array.isArray(m.moduleIds)) {
        for (const mid of m.moduleIds) {
          if (typeof mid === 'string') {
            scopedModuleIds.push(mid);
          }
        }
      }
    }

    if (scopedModuleIds.length > 0) {
      const progressions = await prisma.progression.findMany({
        where: {
          cohortModule: {
            moduleId: { in: scopedModuleIds },
            cohorteId: { in: cohorteIds },
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      stagiaireuserIds = progressions.map((p) => p.userId);
    } else {
      stagiaireuserIds = [];
    }
  } else {
    // FORMATEUR_PRINCIPAL ou ADMIN : tous les stagiaires des cohortes
    const membersInCohortes = await prisma.membership.findMany({
      where: {
        cohorteId: { in: cohorteIds },
        role: 'STAGIAIRE',
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    stagiaireuserIds = membersInCohortes.map((m) => m.userId);
  }

  if (stagiaireuserIds.length === 0) {
    return {
      data: [],
      meta: { total: 0, page, perPage: PER_PAGE, totalPages: 0 },
    };
  }

  // Construction du filtre Prisma
  type AlertWhere = NonNullable<Parameters<typeof prisma.alert.findMany>[0]>['where'];

  const where: AlertWhere = {
    userId: { in: stagiaireuserIds },
    ...(kind !== 'all' ? { kind } : {}),
    ...(status === 'open' ? { resolvedAt: null } : { resolvedAt: { not: null } }),
    ...(search
      ? {
          user: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };

  const [total, alerts] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        kind: true,
        severity: true,
        context: true,
        createdAt: true,
        resolvedAt: true,
        resolvedById: true,
        sourceType: true,
        sourceId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  logger.info({ uid: hashId(dbUser.id), total, page, kind, status }, 'alerts.list');

  return {
    data: alerts,
    meta: {
      total,
      page,
      perPage: PER_PAGE,
      totalPages: Math.ceil(total / PER_PAGE),
    },
  };
});
