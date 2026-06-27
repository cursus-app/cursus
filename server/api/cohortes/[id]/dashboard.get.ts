/**
 * GET /api/cohortes/:id/dashboard — dashboard formateur : KPIs + heatmap.
 *
 * Retourne :
 *  - kpis : medianProgress %, openAlerts, capstonesThisWeek, submissionRate %
 *  - heatmap : matrice [stagiaire][cohortModule] = { status, hasAlert }
 *  - metadata : { trainees, modules }
 *
 * Auth : FORMATEUR_PRINCIPAL ou CO_FORMATEUR de la cohorte, ou ADMIN.
 *
 * Cf. ST-13.2 — Dashboard formateur vue cohorte (heatmap).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import type { ProgressionStatus } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeatmapCell {
  userId: string;
  cohortModuleId: string;
  status: ProgressionStatus;
  hasAlert: boolean;
}

export interface HeatmapTrainee {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  githubHandle: string | null;
}

export interface HeatmapModule {
  id: string;
  moduleId: string;
  position: number;
  dueDate: string;
  title: string;
  week: number;
}

export interface DashboardResponse {
  kpis: {
    medianProgress: number;
    openAlerts: number;
    capstonesThisWeek: number;
    submissionRate: number;
  };
  heatmap: HeatmapCell[];
  metadata: {
    trainees: HeatmapTrainee[];
    modules: HeatmapModule[];
  };
}

// ─── Helper — médiane ────────────────────────────────────────────────────────

export function computeMedian(values: number[]): number {
  if (values.length === 0) {return 0;}
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  }
  return sorted[mid] ?? 0;
}

// ─── Helper — taux de soumission cette semaine ───────────────────────────────

export function computeSubmissionRate(
  progressions: { status: ProgressionStatus; dueDate: Date }[],
  now: Date,
): number {
  // Modules dont la dueDate est dans les 7 derniers jours (semaine courante)
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const relevant = progressions.filter((p) => p.dueDate >= weekStart && p.dueDate <= now);
  if (relevant.length === 0) {return 0;}
  const submitted = relevant.filter((p) =>
    (['SOUMIS', 'VALIDE', 'VALIDE_OVERRIDE'] as ProgressionStatus[]).includes(p.status),
  ).length;
  return Math.round((submitted / relevant.length) * 100);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event): Promise<DashboardResponse> => {
  const cohorteId = getRouterParam(event, 'id');

  if (!cohorteId) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:dashboard:${supabaseUser['id']}`, 60, 60_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ─── Vérifier que la cohorte existe ──────────────────────────────────────

  const cohorte = await prisma.cohorte.findUnique({
    where: { id: cohorteId },
    select: { id: true },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  // ─── Contrôle d'accès : formateur/co-formateur de la cohorte ou admin ────

  const isAdmin = dbUser.globalRole === 'ADMIN';

  if (!isAdmin) {
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
        'cohorte.dashboard.forbidden',
      );
      throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
    }
  }

  // ─── Récupérer les données en parallèle ──────────────────────────────────

  const [traineesMemberships, cohortModules] = await Promise.all([
    prisma.membership.findMany({
      where: { cohorteId, role: 'STAGIAIRE' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            githubHandle: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.cohortModule.findMany({
      where: { cohorteId },
      include: {
        module: { select: { title: true, week: true } },
      },
      orderBy: { position: 'asc' },
    }),
  ]);

  const traineeIds = traineesMemberships.map((m) => m.userId);

  // Progressions de tous les stagiaires sur les modules de cette cohorte
  const cohortModuleIds = cohortModules.map((cm) => cm.id);

  const progressions = await prisma.progression.findMany({
    where: {
      userId: { in: traineeIds },
      cohortModuleId: { in: cohortModuleIds },
    },
    select: {
      userId: true,
      cohortModuleId: true,
      status: true,
      dueDate: true,
    },
  });

  // Alertes ouvertes pour les stagiaires de cette cohorte
  const openAlerts = await prisma.alert.count({
    where: {
      userId: { in: traineeIds },
      resolvedAt: null,
    },
  });

  // ─── Calcul des KPIs ─────────────────────────────────────────────────────

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Médiane : % de modules validés par stagiaire
  const totalModules = cohortModuleIds.length;
  const progressByUser = traineeIds.map((uid) => {
    if (totalModules === 0) {return 0;}
    const userProgressions = progressions.filter((p) => p.userId === uid);
    const validated = userProgressions.filter((p) =>
      (['VALIDE', 'VALIDE_OVERRIDE'] as ProgressionStatus[]).includes(p.status),
    ).length;
    return Math.round((validated / totalModules) * 100);
  });

  const medianProgress = computeMedian(progressByUser);

  // Capstones cette semaine : modules dont la dueDate est dans les 7 prochains jours
  const capstonesThisWeek = cohortModules.filter((cm) => {
    const due = new Date(cm.dueDate);
    return due >= now && due <= weekEnd;
  }).length;

  // Taux de soumission
  const submissionRate = computeSubmissionRate(
    progressions.map((p) => ({ status: p.status, dueDate: new Date(p.dueDate) })),
    now,
  );

  // ─── Construction de la heatmap ──────────────────────────────────────────

  // Index hasAlert par userId
  const alertsByUser = new Set<string>();
  const alertsByUserModule = new Map<string, Set<string>>();

  // Alertes détaillées pour marquer les cellules
  const alertDetails = await prisma.alert.findMany({
    where: {
      userId: { in: traineeIds },
      resolvedAt: null,
    },
    select: { userId: true, sourceId: true },
  });

  for (const alert of alertDetails) {
    alertsByUser.add(alert.userId);
    if (alert.sourceId) {
      const key = `${alert.userId}:${alert.sourceId}`;
      let keySet = alertsByUserModule.get(key);
      if (!keySet) {
        keySet = new Set();
        alertsByUserModule.set(key, keySet);
      }
      keySet.add(alert.sourceId);
    }
  }

  // Construire la matrice de cellules (une par (userId, cohortModuleId))
  const progressionMap = new Map<string, ProgressionStatus>();
  for (const p of progressions) {
    progressionMap.set(`${p.userId}:${p.cohortModuleId}`, p.status);
  }

  const heatmap: HeatmapCell[] = [];

  for (const membership of traineesMemberships) {
    const uid = membership.userId;
    for (const cm of cohortModules) {
      const status = progressionMap.get(`${uid}:${cm.id}`) ?? 'A_VENIR';
      const alertKey = `${uid}:${cm.id}`;
      const hasAlert = alertsByUserModule.has(alertKey) || false;
      heatmap.push({
        userId: uid,
        cohortModuleId: cm.id,
        status,
        hasAlert,
      });
    }
  }

  // ─── Metadata ────────────────────────────────────────────────────────────

  const trainees: HeatmapTrainee[] = traineesMemberships.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
    avatarUrl: m.user.avatarUrl,
    githubHandle: m.user.githubHandle,
  }));

  const modules: HeatmapModule[] = cohortModules.map((cm) => ({
    id: cm.id,
    moduleId: cm.moduleId,
    position: cm.position,
    dueDate: cm.dueDate.toISOString(),
    title: cm.module.title,
    week: cm.module.week,
  }));

  logger.info(
    {
      cohorteId,
      formateurIdHash: hashId(dbUser.id),
      traineesCount: trainees.length,
      modulesCount: modules.length,
    },
    'cohorte.heatmap.viewed',
  );

  return {
    kpis: {
      medianProgress,
      openAlerts,
      capstonesThisWeek,
      submissionRate,
    },
    heatmap,
    metadata: { trainees, modules },
  };
});
