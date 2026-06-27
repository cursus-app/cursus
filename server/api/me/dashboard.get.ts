/**
 * GET /api/me/dashboard — données agrégées du dashboard stagiaire.
 *
 * Retourne en un seul round-trip :
 *   - currentWeek : module en cours, date limite, statut, soumission
 *   - progress    : modules complétés / total, % cursus, XP total
 *   - badges      : total badges + 3 derniers
 *   - feed        : 3 derniers événements positifs de la cohorte (VALIDE / badge)
 *   - upcomingDeadlines : 3 prochains CohortModules par dueDate
 *
 * Sécurité : un stagiaire ne voit que ses propres données + événements
 * publics de sa cohorte. Pas de PII d'autres stagiaires dans le feed.
 *
 * ST-13.1
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

  const userId = supabaseUser['id'] as string;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      globalRole: true,
      xpTotal: true,
      memberships: {
        where: { leftAt: null },
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: {
          role: true,
          cohorteId: true,
          cohorte: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!dbUser) {
    throw createError({ statusCode: 401, message: 'User profile not found' });
  }

  const activeMembership = dbUser.memberships[0] ?? null;
  const cohorteId = activeMembership?.cohorteId ?? null;

  logger.info(
    { userIdHash: hashId(userId), cohorteId },
    'dashboard.viewed',
  );

  // ── 1 · Module de la semaine en cours ────────────────────────────────────────
  // Récupère le CohortModule dont la dueDate est la plus proche dans le futur
  // (ou le dernier EN_COURS / EN_RETARD s'il dépasse la date).
  let currentWeek: {
    moduleId: string | null;
    moduleTitle: string | null;
    dueDate: string | null;
    status: string | null;
    hasSubmitted: boolean;
    cohortModuleId: string | null;
  } = {
    moduleId: null,
    moduleTitle: null,
    dueDate: null,
    status: null,
    hasSubmitted: false,
    cohortModuleId: null,
  };

  if (cohorteId) {
    // Trouver la progression EN_COURS ou la plus récente non validée
    const activeProgression = await prisma.progression.findFirst({
      where: {
        userId,
        status: { in: ['EN_COURS', 'EN_RETARD', 'EN_ALERTE', 'SOUMIS'] },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        status: true,
        dueDate: true,
        cohortModuleId: true,
        cohortModule: {
          select: {
            id: true,
            moduleId: true,
            module: { select: { title: true } },
          },
        },
      },
    });

    if (activeProgression) {
      const hasSubmitted = activeProgression.status === 'SOUMIS';
      currentWeek = {
        moduleId: activeProgression.cohortModule.moduleId,
        moduleTitle: activeProgression.cohortModule.module.title,
        dueDate: activeProgression.dueDate.toISOString(),
        status: activeProgression.status,
        hasSubmitted,
        cohortModuleId: activeProgression.cohortModuleId,
      };
    } else {
      // Aucune progression EN_COURS — prendre le prochain CohortModule A_VENIR
      const nextProgression = await prisma.progression.findFirst({
        where: { userId, status: 'A_VENIR' },
        orderBy: { dueDate: 'asc' },
        select: {
          status: true,
          dueDate: true,
          cohortModuleId: true,
          cohortModule: {
            select: {
              id: true,
              moduleId: true,
              module: { select: { title: true } },
            },
          },
        },
      });

      if (nextProgression) {
        currentWeek = {
          moduleId: nextProgression.cohortModule.moduleId,
          moduleTitle: nextProgression.cohortModule.module.title,
          dueDate: nextProgression.dueDate.toISOString(),
          status: nextProgression.status,
          hasSubmitted: false,
          cohortModuleId: nextProgression.cohortModuleId,
        };
      }
    }
  }

  // ── 2 · Progression globale du cursus ────────────────────────────────────────
  const [completedCount, totalCount] = await Promise.all([
    prisma.progression.count({
      where: {
        userId,
        status: { in: ['VALIDE', 'VALIDE_OVERRIDE'] },
      },
    }),
    cohorteId
      ? prisma.cohortModule.count({ where: { cohorteId } })
      : Promise.resolve(0),
  ]);

  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const progress = {
    completedModules: completedCount,
    totalModules: totalCount,
    progressPct,
    xpTotal: dbUser.xpTotal,
  };

  // ── 3 · Badges ────────────────────────────────────────────────────────────────
  const [badgeTotal, last3Badges] = await Promise.all([
    prisma.userBadge.count({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
      take: 3,
      select: {
        awardedAt: true,
        badge: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            iconUrl: true,
            xpReward: true,
          },
        },
      },
    }),
  ]);

  const badges = {
    total: badgeTotal,
    last3: last3Badges.map((ub) => ({
      id: ub.badge.id,
      code: ub.badge.code,
      name: ub.badge.name,
      description: ub.badge.description,
      iconUrl: ub.badge.iconUrl,
      xpReward: ub.badge.xpReward,
      awardedAt: ub.awardedAt.toISOString(),
    })),
  };

  // ── 4 · Feed cohorte — 3 derniers événements positifs ────────────────────────
  // On remonte les progressions VALIDE de la cohorte (événements positifs).
  // PAS de PII : on ne retourne jamais email/nom d'un autre stagiaire.
  let feed: Array<{
    type: 'VALIDATION' | 'BADGE';
    moduleTitle: string | null;
    badgeName: string | null;
    occurredAt: string;
  }> = [];

  if (cohorteId) {
    const recentValidations = await prisma.progression.findMany({
      where: {
        status: { in: ['VALIDE', 'VALIDE_OVERRIDE'] },
        cohortModule: { cohorteId },
      },
      orderBy: { validatedAt: 'desc' },
      take: 3,
      select: {
        validatedAt: true,
        cohortModule: {
          select: { module: { select: { title: true } } },
        },
      },
    });

    feed = recentValidations
      .filter((p): p is typeof p & { validatedAt: Date } => p.validatedAt !== null)
      .map((p) => ({
        type: 'VALIDATION' as const,
        moduleTitle: p.cohortModule.module.title,
        badgeName: null,
        occurredAt: p.validatedAt.toISOString(),
      }));
  }

  // ── 5 · Prochaines échéances (3 prochains CohortModules) ─────────────────────
  let upcomingDeadlines: Array<{
    cohortModuleId: string;
    moduleId: string;
    moduleTitle: string;
    dueDate: string;
    progressionStatus: string | null;
  }> = [];

  if (cohorteId) {
    const upcoming = await prisma.cohortModule.findMany({
      where: {
        cohorteId,
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
      select: {
        id: true,
        moduleId: true,
        dueDate: true,
        module: { select: { title: true } },
        progressions: {
          where: { userId },
          take: 1,
          select: { status: true },
        },
      },
    });

    upcomingDeadlines = upcoming.map((cm) => ({
      cohortModuleId: cm.id,
      moduleId: cm.moduleId,
      moduleTitle: cm.module.title,
      dueDate: cm.dueDate.toISOString(),
      progressionStatus: cm.progressions[0]?.status ?? null,
    }));
  }

  return {
    currentWeek,
    progress,
    badges,
    feed,
    upcomingDeadlines,
  };
});
