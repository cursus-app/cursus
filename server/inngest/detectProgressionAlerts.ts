/**
 * Inngest cron — détection automatique d'alertes de progression.
 * Cf. ST-08.2 — TT-08.2.1 à TT-08.2.4.
 *
 * Tourne 1× par jour à 6h UTC. Scanne les progressions de chaque
 * cohorte ACTIVE et crée des alertes idempotentes pour le formateur.
 *
 * Règles :
 *   R1 — SUBMISSION_LATE        : pas de soumission 48h+ après dueDate
 *   R2 — QUIZ_REPEATEDLY_FAILED : 2+ échecs sur le même quiz
 *   R3 — SUBMISSION_REPEATEDLY_FAILED : 5+ soumissions FAILED sur même module
 *   R4 — PROGRESS_STALLED       : EN_COURS sans activité depuis 7+ jours
 *
 * Idempotence : même (userId, kind, sourceId) dans les 24h précédentes
 * = on ne crée pas de doublon.
 */

import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import type { Prisma, AlertKind, AlertSeverity, ProgressionStatus } from '@prisma/client';

// ─── Constantes ───────────────────────────────────────────────────────────────

const MS_48H = 48 * 60 * 60 * 1_000;
const MS_7D = 7 * 24 * 60 * 60 * 1_000;
const MS_24H = 24 * 60 * 60 * 1_000;

/** Seuil R2 : nombre minimum d'échecs quiz déclenchant l'alerte. */
const QUIZ_FAIL_THRESHOLD = 2;
/** Seuil R3 : nombre minimum de soumissions FAILED déclenchant l'alerte. */
const SUBMISSION_FAIL_THRESHOLD = 5;

/** Sévérité par kind d'alerte (spec ST-08.2). */
const SEVERITY_BY_KIND: Readonly<Record<AlertKind, AlertSeverity>> = {
  SUBMISSION_LATE: 'HIGH',
  QUIZ_REPEATEDLY_FAILED: 'MEDIUM',
  SUBMISSION_REPEATEDLY_FAILED: 'HIGH',
  STAGIAIRE_BLOCKED: 'HIGH',
  PROGRESS_STALLED: 'LOW',
  CAPSTONE_OVERDUE: 'HIGH',
} as const;

/**
 * Statuts indiquant qu'un livrable a été soumis/traité :
 * on ne crée pas d'alerte SUBMISSION_LATE pour ces progressions.
 */
const ALREADY_SUBMITTED_STATUSES: ProgressionStatus[] = [
  'SOUMIS',
  'VALIDE',
  'VALIDE_OVERRIDE',
  'BLOQUE',
];

// ─── Types internes ───────────────────────────────────────────────────────────

interface AlertInput {
  userId: string;
  kind: AlertKind;
  /** UUID — sourceId référence un moduleId ou quizId selon la règle. */
  sourceId: string;
  context: Record<string, unknown>;
}

// ─── Fonction principale Inngest ──────────────────────────────────────────────

export const detectProgressionAlerts = inngest.createFunction(
  {
    id: 'detect-progression-alerts',
    name: 'Alertes — détection automatique quotidienne des dérives',
    retries: 3,
    triggers: [{ cron: '0 6 * * *' }],
  },
  async ({ step }) => {
    const now = new Date();

    // Récupérer toutes les cohortes ACTIVE — règle "active cohorts only"
    const activeCohortes = await step.run('fetch-active-cohortes', async () => {
      return prisma.cohorte.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
      });
    });

    logger.info(
      { event: 'cron.detect_alerts.started', cohortCount: activeCohortes.length },
      'cron.detect_alerts.started',
    );

    let totalAlertsCreated = 0;

    // Un step par cohorte — checkpoint Inngest pour résistance aux pannes
    for (const cohorte of activeCohortes) {
      const created = await step.run(`process-cohort-${cohorte.id}`, async () => {
        return detectAlertsForCohort(cohorte.id, now);
      });
      totalAlertsCreated += created;
    }

    logger.info(
      { event: 'cron.detect_alerts.completed', alertsCreated: totalAlertsCreated },
      'cron.detect_alerts.completed',
    );

    return { alertsCreated: totalAlertsCreated, cohortCount: activeCohortes.length };
  },
);

// ─── Logique métier par cohorte (exportée pour les tests unitaires) ───────────

/**
 * Applique les 4 règles d'alertes pour une cohorte donnée.
 * Retourne le nombre d'alertes créées (dédupliquées).
 *
 * Exportée pour permettre les tests unitaires sans mock Inngest.
 */
export async function detectAlertsForCohort(cohorteId: string, now: Date): Promise<number> {
  // ── Chargement des données de la cohorte ────────────────────────────────────

  const [stagiaireIds, formateurIds, cohortModules] = await Promise.all([
    // Stagiaires actifs (non partis)
    prisma.membership
      .findMany({
        where: { cohorteId, role: 'STAGIAIRE', leftAt: null },
        select: { userId: true },
      })
      .then((ms) => ms.map((m) => m.userId)),

    // Formateurs principaux pour les notifications
    prisma.membership
      .findMany({
        where: { cohorteId, role: 'FORMATEUR_PRINCIPAL', leftAt: null },
        select: { userId: true },
      })
      .then((ms) => ms.map((m) => m.userId)),

    // Modules de la cohorte avec leur titre
    prisma.cohortModule.findMany({
      where: { cohorteId },
      select: {
        id: true,
        moduleId: true,
        module: { select: { title: true } },
      },
    }),
  ]);

  if (stagiaireIds.length === 0) {
    return 0;
  }

  const cohortModuleIds = cohortModules.map((cm) => cm.id);
  const moduleIdByCMId = new Map(cohortModules.map((cm) => [cm.id, cm.moduleId]));
  const titleByCMId = new Map(cohortModules.map((cm) => [cm.id, cm.module.title]));
  const allModuleIds = cohortModules.map((cm) => cm.moduleId);

  // ── Requêtes en parallèle pour les 4 règles ──────────────────────────────

  const [lateProgressions, failedQuizAttempts, failedSubmissions, stalledProgressions] =
    await Promise.all([
      // R1 — SUBMISSION_LATE : dueDate < now-48h ET statut non soumis
      prisma.progression.findMany({
        where: {
          userId: { in: stagiaireIds },
          cohortModuleId: { in: cohortModuleIds },
          dueDate: { lt: new Date(now.getTime() - MS_48H) },
          status: { notIn: ALREADY_SUBMITTED_STATUSES },
        },
        select: { userId: true, cohortModuleId: true, dueDate: true },
      }),

      // R2 — QUIZ_REPEATEDLY_FAILED : attempts quiz échouées
      prisma.quizAttempt.findMany({
        where: {
          userId: { in: stagiaireIds },
          passed: false,
        },
        select: { userId: true, quizId: true },
      }),

      // R3 — SUBMISSION_REPEATEDLY_FAILED : soumissions FAILED
      prisma.submission.findMany({
        where: {
          userId: { in: stagiaireIds },
          moduleId: { in: allModuleIds },
          status: 'FAILED',
        },
        select: { userId: true, moduleId: true },
      }),

      // R4 — PROGRESS_STALLED : EN_COURS sans activité 7+ jours
      prisma.progression.findMany({
        where: {
          userId: { in: stagiaireIds },
          cohortModuleId: { in: cohortModuleIds },
          status: 'EN_COURS',
          updatedAt: { lt: new Date(now.getTime() - MS_7D) },
        },
        select: { userId: true, cohortModuleId: true, updatedAt: true },
      }),
    ]);

  // ── Construction des inputs d'alertes ─────────────────────────────────────

  const alertInputs: AlertInput[] = [];

  // R1 — SUBMISSION_LATE
  for (const p of lateProgressions) {
    const moduleId = moduleIdByCMId.get(p.cohortModuleId);
    const moduleTitle = titleByCMId.get(p.cohortModuleId);
    if (!moduleId) {
      continue;
    }

    const daysLate = Math.floor((now.getTime() - p.dueDate.getTime()) / (24 * 60 * 60 * 1_000));
    alertInputs.push({
      userId: p.userId,
      kind: 'SUBMISSION_LATE',
      sourceId: moduleId,
      context: {
        cohortModuleId: p.cohortModuleId,
        moduleTitle: moduleTitle ?? '',
        daysLate,
      },
    });
  }

  // R2 — QUIZ_REPEATEDLY_FAILED (groupé userId → quizId → count)
  const quizFailCounts = new Map<string, Map<string, number>>();
  for (const attempt of failedQuizAttempts) {
    let userMap = quizFailCounts.get(attempt.userId);
    if (!userMap) {
      userMap = new Map<string, number>();
      quizFailCounts.set(attempt.userId, userMap);
    }
    userMap.set(attempt.quizId, (userMap.get(attempt.quizId) ?? 0) + 1);
  }
  for (const [userId, userMap] of quizFailCounts) {
    for (const [quizId, count] of userMap) {
      if (count >= QUIZ_FAIL_THRESHOLD) {
        alertInputs.push({
          userId,
          kind: 'QUIZ_REPEATEDLY_FAILED',
          sourceId: quizId,
          context: { quizId, attemptCount: count },
        });
      }
    }
  }

  // R3 — SUBMISSION_REPEATEDLY_FAILED (groupé userId → moduleId → count)
  const subFailCounts = new Map<string, Map<string, number>>();
  for (const sub of failedSubmissions) {
    let userMap = subFailCounts.get(sub.userId);
    if (!userMap) {
      userMap = new Map<string, number>();
      subFailCounts.set(sub.userId, userMap);
    }
    userMap.set(sub.moduleId, (userMap.get(sub.moduleId) ?? 0) + 1);
  }
  for (const [userId, userMap] of subFailCounts) {
    for (const [moduleId, count] of userMap) {
      if (count >= SUBMISSION_FAIL_THRESHOLD) {
        const cohortModule = cohortModules.find((cm) => cm.moduleId === moduleId);
        alertInputs.push({
          userId,
          kind: 'SUBMISSION_REPEATEDLY_FAILED',
          sourceId: moduleId,
          context: {
            cohortModuleId: cohortModule?.id ?? '',
            moduleTitle: cohortModule?.module.title ?? '',
            attemptCount: count,
          },
        });
      }
    }
  }

  // R4 — PROGRESS_STALLED
  for (const p of stalledProgressions) {
    const moduleId = moduleIdByCMId.get(p.cohortModuleId);
    const moduleTitle = titleByCMId.get(p.cohortModuleId);
    if (!moduleId) {
      continue;
    }

    const daysStalled = Math.floor(
      (now.getTime() - p.updatedAt.getTime()) / (24 * 60 * 60 * 1_000),
    );
    alertInputs.push({
      userId: p.userId,
      kind: 'PROGRESS_STALLED',
      sourceId: moduleId,
      context: {
        cohortModuleId: p.cohortModuleId,
        moduleTitle: moduleTitle ?? '',
        daysStalled,
      },
    });
  }

  // ── Idempotence + création des alertes ───────────────────────────────────

  const since24h = new Date(now.getTime() - MS_24H);
  let alertsCreated = 0;

  for (const input of alertInputs) {
    // Vérification idempotence : même (userId, kind, sourceId) ouvert dans les 24h
    const existing = await prisma.alert.findFirst({
      where: {
        userId: input.userId,
        kind: input.kind,
        sourceId: input.sourceId,
        resolvedAt: null,
        createdAt: { gte: since24h },
      },
      select: { id: true },
    });

    if (existing) {
      // Alerte déjà créée aujourd'hui — skip (idempotence)
      continue;
    }

    // Création de l'alerte
    const alert = await prisma.alert.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        severity: SEVERITY_BY_KIND[input.kind],
        sourceType: 'progression',
        sourceId: input.sourceId,
        context: input.context as Prisma.InputJsonValue,
      },
    });

    logger.info(
      {
        event: 'progression.alert.detected',
        alertId: alert.id,
        // userId est un UUID — pas de PII
        userId: alert.userId,
        kind: alert.kind,
        sourceId: alert.sourceId,
      },
      'progression.alert.detected',
    );

    // Notification pour chaque FORMATEUR_PRINCIPAL de la cohorte
    for (const formateurId of formateurIds) {
      await prisma.notification.create({
        data: {
          userId: formateurId,
          type: 'ALERT_RAISED',
          title: `Alerte stagiaire : ${alert.kind.toLowerCase().replace(/_/g, ' ')}`,
          body: `Un stagiaire de votre cohorte nécessite votre attention (${alert.kind}).`,
          payloadJson: {
            alertId: alert.id,
            alertKind: alert.kind,
            stagiaireId: input.userId,
            cohorteId: cohorteId,
          },
        },
      });
    }

    alertsCreated++;
  }

  return alertsCreated;
}
