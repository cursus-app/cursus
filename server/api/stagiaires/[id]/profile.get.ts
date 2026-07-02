/**
 * GET /api/stagiaires/:id/profile — profil d'un stagiaire + KPIs pour la fiche 360.
 *
 * Auth : FORMATEUR_PRINCIPAL ou CO_FORMATEUR de la cohorteId passée en query.
 * Query : cohorteId (required)
 *
 * Cf. ST-13.3 — TT-13.3.2 (StagiaireHeader KPIs)
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import type { StagiaireProfile } from '~~/shared/types/timeline';

export default defineEventHandler(async (event): Promise<StagiaireProfile> => {
  const stagiaireId = getRouterParam(event, 'id');
  if (!stagiaireId) {
    throw createError({ statusCode: 400, message: 'Missing stagiaire id' });
  }

  const query = getQuery(event);
  const cohorteId = typeof query['cohorteId'] === 'string' ? query['cohorteId'] : '';
  if (!cohorteId) {
    throw createError({ statusCode: 400, message: 'Missing cohorteId query param' });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`stagiaires:profile:${supabaseUser['id']}`, 60, 60_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });
  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ── Vérifier que le caller est formateur de la cohorte ────────────────────
  const isAdmin = dbUser.globalRole === 'ADMIN';
  if (!isAdmin) {
    const callerMembership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        cohorteId,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
      select: { id: true },
    });
    if (!callerMembership) {
      logger.warn({ formateurIdHash: hashId(dbUser.id), cohorteId }, 'stagiaire.profile.forbidden');
      throw createError({ statusCode: 403, message: 'Forbidden' });
    }
  }

  // ── Vérifier que le stagiaire est dans la cohorte ─────────────────────────
  const stagiaireMembership = await prisma.membership.findFirst({
    where: { userId: stagiaireId, cohorteId, role: 'STAGIAIRE' },
    select: { leftAt: true },
  });
  if (!stagiaireMembership) {
    throw createError({ statusCode: 403, message: 'Stagiaire not in this cohorte' });
  }

  // ── Charger les données en parallèle ──────────────────────────────────────
  const [stagiaireUser, activeAlertsCount, cohortModules] = await Promise.all([
    prisma.user.findUnique({
      where: { id: stagiaireId },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    }),
    prisma.alert.count({
      where: { userId: stagiaireId, resolvedAt: null },
    }),
    prisma.cohortModule.findMany({
      where: { cohorteId },
      select: { id: true },
    }),
  ]);

  if (!stagiaireUser) {
    throw createError({ statusCode: 404, message: 'Stagiaire not found' });
  }

  // ── % Cursus ──────────────────────────────────────────────────────────────
  let cursusProgress = 0;
  if (cohortModules.length > 0) {
    const validatedCount = await prisma.progression.count({
      where: {
        userId: stagiaireId,
        cohortModuleId: { in: cohortModules.map((m) => m.id) },
        status: { in: ['VALIDE', 'VALIDE_OVERRIDE'] },
      },
    });
    cursusProgress = Math.round((validatedCount / cohortModules.length) * 100);
  }

  // ── Dernière activité (soumission la plus récente) ────────────────────────
  const lastSubmission = await prisma.submission.findFirst({
    where: { userId: stagiaireId },
    orderBy: { submittedAt: 'desc' },
    select: { submittedAt: true },
  });

  logger.info(
    {
      formateurIdHash: hashId(dbUser.id),
      stagiaireIdHash: hashId(stagiaireId),
      cohorteId,
    },
    'stagiaire.profile.viewed',
  );

  return {
    id: stagiaireUser.id,
    fullName: stagiaireUser.fullName,
    email: stagiaireUser.email,
    avatarUrl: stagiaireUser.avatarUrl,
    isDisabled: stagiaireMembership.leftAt !== null,
    kpis: {
      cursusProgress,
      activeAlerts: activeAlertsCount,
      lastActivity: lastSubmission?.submittedAt.toISOString() ?? null,
    },
  };
});
