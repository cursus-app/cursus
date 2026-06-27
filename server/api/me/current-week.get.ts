/**
 * GET /api/me/current-week — semaine courante du stagiaire authentifié.
 *
 * Retourne le CohortModule en cours avec :
 *  - les infos du module (titre, semaine, ressources, livrable, quiz)
 *  - l'état de progression (status, dueDate)
 *  - un compte à rebours calculé côté serveur (daysLeft)
 *  - la liste complète des modules (pour la timeline)
 *
 * Redirige (404) si le stagiaire n'a pas de cohorte active.
 * Requiert une session Supabase valide.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

/** Forme de chaque ressource stockée dans Module.resourcesJson */
interface ResourceItem {
  url: string;
  title: string;
  type?: string;
}

/** Forme du livrable stocké dans Module.deliverableSpecJson */
interface DeliverableSpec {
  description?: string;
  repoRequired?: boolean;
  deployRequired?: boolean;
  checksJson?: Record<string, unknown>;
}

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const userId = supabaseUser['id'] as string;

  // Récupérer la cohorte active du stagiaire (membership STAGIAIRE, leftAt null)
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      role: 'STAGIAIRE',
      leftAt: null,
      cohorte: { status: 'ACTIVE' },
    },
    select: {
      cohorteId: true,
      cohorte: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!membership) {
    logger.info({ userIdHash: hashId(userId) }, 'current_week.no_active_cohort');
    // Pas de cohorte active : retourner un état vide plutôt qu'une erreur
    return {
      cohort: null,
      currentModule: null,
      progression: null,
      allModules: [],
    };
  }

  const cohorteId = membership.cohorteId;

  // Récupérer tous les cohortModules avec leur progression pour ce stagiaire
  const cohortModules = await prisma.cohortModule.findMany({
    where: { cohorteId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      dueDate: true,
      position: true,
      module: {
        select: {
          id: true,
          week: true,
          title: true,
          objectives: true,
          resourcesJson: true,
          deliverableSpecJson: true,
          quizId: true,
          xpReward: true,
        },
      },
      progressions: {
        where: { userId },
        select: {
          id: true,
          status: true,
          dueDate: true,
          submittedAt: true,
          validatedAt: true,
        },
        take: 1,
      },
    },
  });

  if (cohortModules.length === 0) {
    logger.info({ userIdHash: hashId(userId), cohorteId }, 'current_week.no_modules');
    return {
      cohort: membership.cohorte,
      currentModule: null,
      progression: null,
      allModules: [],
    };
  }

  const now = new Date();

  // Mapper les modules avec leur progression
  const allModules = cohortModules.map((cm) => {
    const progression = cm.progressions[0] ?? null;
    const dueDate = progression?.dueDate ?? cm.dueDate;
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      cohortModuleId: cm.id,
      moduleId: cm.module.id,
      week: cm.module.week,
      title: cm.module.title,
      position: cm.position,
      dueDate: dueDate.toISOString(),
      daysLeft,
      isLate: daysLeft < 0,
      status: progression?.status ?? 'A_VENIR',
      submittedAt: progression?.submittedAt?.toISOString() ?? null,
      validatedAt: progression?.validatedAt?.toISOString() ?? null,
      hasQuiz: cm.module.quizId !== null,
    };
  });

  // Identifier la semaine courante :
  // Priorité 1 : premier module EN_COURS ou EN_RETARD
  // Priorité 2 : premier module A_VENIR dont la dueDate n'est pas encore dépassée
  // Priorité 3 : dernier module (si tous validés)
  const activeStatuses = new Set(['EN_COURS', 'EN_RETARD', 'EN_ALERTE', 'BLOQUE']);

  let currentModuleData = allModules.find((m) => activeStatuses.has(m.status));

  if (!currentModuleData) {
    currentModuleData = allModules.find((m) => m.status === 'A_VENIR');
  }

  if (!currentModuleData) {
    // Tous VALIDE/SOUMIS → pointer sur le dernier
    currentModuleData = allModules[allModules.length - 1];
  }

  if (!currentModuleData) {
    return {
      cohort: membership.cohorte,
      currentModule: null,
      progression: null,
      allModules,
    };
  }

  // Récupérer le détail complet du module courant
  const currentCohortModuleId = currentModuleData.cohortModuleId;
  const currentCm = cohortModules.find((cm) => cm.id === currentCohortModuleId);
  if (!currentCm) {
    throw createError({ statusCode: 500, message: 'Internal error: CohortModule not found' });
  }

  const resources = (currentCm.module.resourcesJson as ResourceItem[] | null) ?? [];
  const deliverable = (currentCm.module.deliverableSpecJson as DeliverableSpec | null) ?? {};

  // Récupérer le quiz title si présent
  let quizTitle: string | null = null;
  if (currentCm.module.quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: currentCm.module.quizId },
      select: { title: true },
    });
    quizTitle = quiz?.title ?? null;
  }

  const currentModuleDueDate = currentModuleData.dueDate;
  const daysLeft = currentModuleData.daysLeft;

  logger.info(
    { userIdHash: hashId(userId), week: currentCm.module.week },
    'stagiaire.dashboard.viewed',
  );

  return {
    cohort: {
      id: membership.cohorte.id,
      name: membership.cohorte.name,
      startDate: membership.cohorte.startDate.toISOString(),
      endDate: membership.cohorte.endDate.toISOString(),
    },
    currentModule: {
      cohortModuleId: currentCm.id,
      moduleId: currentCm.module.id,
      week: currentCm.module.week,
      title: currentCm.module.title,
      objectives: currentCm.module.objectives,
      resources: resources.map((r) => ({
        url: r.url,
        title: r.title,
        type: r.type ?? 'link',
      })),
      deliverable: {
        description: deliverable.description ?? null,
        repoRequired: deliverable.repoRequired ?? false,
        deployRequired: deliverable.deployRequired ?? false,
      },
      hasQuiz: currentCm.module.quizId !== null,
      quizId: currentCm.module.quizId ?? null,
      quizTitle,
      xpReward: currentCm.module.xpReward,
      dueDate: currentModuleDueDate,
      daysLeft,
      isLate: daysLeft < 0,
    },
    progression: {
      status: currentModuleData.status,
      submittedAt: currentModuleData.submittedAt,
      validatedAt: currentModuleData.validatedAt,
    },
    totalModules: cohortModules.length,
    allModules,
  };
});
