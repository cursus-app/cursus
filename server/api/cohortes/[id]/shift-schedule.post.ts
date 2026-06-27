/**
 * POST /api/cohortes/:id/shift-schedule — décale toutes les échéances d'une cohorte de N jours.
 *
 * Fonctionnement :
 *  - Si body.preview = true → aperçu sans application
 *  - Sinon → applique le décalage en transaction atomique
 *  - Un décalage en arrière (days < 0) nécessite body.confirmed = true
 *
 * Autorisé pour : formateur principal de la cohorte ou ADMIN global.
 * Rate limit : 3 décalages par cohorte par jour.
 *
 * Cf. ST-04.4 — Échéancier et décalage de planning.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { shiftScheduleBodySchema } from '~~/shared/schemas/cohorte';

/** Ajoute N jours à une Date et retourne une nouvelle Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Rate limit : max 3 décalages par cohorte par 24h
  checkRateLimit(`cohortes:shift-schedule:${id}`, 3, 24 * 60 * 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const isAdmin = dbUser.globalRole === 'ADMIN';

  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    include: {
      memberships: {
        select: { role: true, userId: true },
      },
      cohortModules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          dueDate: true,
          position: true,
          moduleId: true,
          module: { select: { week: true, title: true } },
        },
      },
    },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const isFormateurPrincipal = cohorte.memberships.some(
    (m) => m.role === 'FORMATEUR_PRINCIPAL' && m.userId === dbUser.id,
  );

  if (!isAdmin && !isFormateurPrincipal) {
    logger.warn(
      { cohorteId: id, userIdHash: hashId(supabaseUser['id']) },
      'cohorte.shift-schedule.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => shiftScheduleBodySchema.parse(raw));

  const { days, reason, preview, confirmed } = body;

  // Décalage en arrière sans confirmation explicite → erreur
  if (days < 0 && !confirmed) {
    throw createError({
      statusCode: 422,
      message: 'cohortes.schedule.errors.confirmRequired',
    });
  }

  // Calculer l'aperçu du nouveau planning
  const previewItems = cohorte.cohortModules.map((cm) => ({
    cohortModuleId: cm.id,
    moduleId: cm.moduleId,
    week: cm.module.week,
    title: cm.module.title,
    currentDueDate: cm.dueDate,
    newDueDate: addDays(cm.dueDate, days),
  }));

  if (preview) {
    return {
      preview: true,
      days,
      items: previewItems,
    };
  }

  // Récupérer les IDs des cohortModules concernés
  const cohortModuleIds = previewItems.map((i) => i.cohortModuleId);

  // Récupérer toutes les progressions concernées pour mise à jour atomique
  const progressions = await prisma.progression.findMany({
    where: { cohortModuleId: { in: cohortModuleIds } },
    select: { id: true, dueDate: true },
  });

  // Construire la liste des stagiaires à notifier
  const stagiaires = cohorte.memberships
    .filter((m) => m.role === 'STAGIAIRE')
    .map((m) => m.userId);

  // Appliquer le décalage en transaction atomique
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mettre à jour les CohortModules
    for (const item of previewItems) {
      await tx.cohortModule.update({
        where: { id: item.cohortModuleId },
        data: { dueDate: item.newDueDate },
      });
    }

    // 2. Mettre à jour les Progressions associées (décalage relatif de N jours)
    for (const prog of progressions) {
      await tx.progression.update({
        where: { id: prog.id },
        data: { dueDate: addDays(prog.dueDate, days) },
      });
    }

    // 3. Créer des notifications pour chaque stagiaire
    const notificationTitle =
      days > 0
        ? `Planning décalé de +${days} jours`
        : `Planning avancé de ${Math.abs(days)} jours`;
    const notificationBody =
      reason != null && reason.length > 0
        ? `La cohorte "${cohorte.name}" a eu son planning ajusté. Raison : ${reason}`
        : `La cohorte "${cohorte.name}" a eu son planning ajusté de ${days} jours.`;

    if (stagiaires.length > 0) {
      await tx.notification.createMany({
        data: stagiaires.map((userId) => ({
          userId,
          type: 'ALERT_RAISED' as const,
          title: notificationTitle,
          body: notificationBody,
          payloadJson: {
            kind: 'SCHEDULE_SHIFTED',
            cohorteId: id,
            days,
            reason: reason ?? null,
          },
        })),
      });
    }

    // 4. Enregistrer l'audit log
    await tx.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: 'cohorte.schedule_shifted',
        entityType: 'Cohorte',
        entityId: id,
        diff: {
          days,
          modulesAffected: previewItems.length,
          progressionsAffected: progressions.length,
          stagiaireNotified: stagiaires.length,
        },
        metadata: {
          reason: reason ?? null,
          cohorteId: id,
          cohorteName: cohorte.name,
        },
      },
    });

    return {
      modulesUpdated: previewItems.length,
      progressionsUpdated: progressions.length,
      stagiaireNotified: stagiaires.length,
    };
  });

  logger.info(
    {
      cohorteId: id,
      userIdHash: hashId(dbUser.id),
      days,
      modulesUpdated: result.modulesUpdated,
      progressionsUpdated: result.progressionsUpdated,
    },
    'cohorte.schedule_shifted',
  );

  return {
    preview: false,
    days,
    modulesUpdated: result.modulesUpdated,
    progressionsUpdated: result.progressionsUpdated,
    stagiaireNotified: result.stagiaireNotified,
    items: previewItems,
  };
});
