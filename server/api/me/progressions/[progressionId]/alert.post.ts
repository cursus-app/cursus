/**
 * POST /api/me/progressions/:progressionId/alert
 *
 * Crée une alerte STAGIAIRE_BLOCKED pour la progression indiquée.
 * Idempotent : si une alerte ouverte existe déjà pour cette progression,
 * met à jour son timestamp (createdAt) plutôt que d'en créer une nouvelle.
 *
 * Auth : requis — un stagiaire ne peut alerter que sur SA propre progression.
 *
 * Body : { message: string (20–500 chars) }
 *
 * Effets de bord :
 *  - Transition progression → BLOQUE (si pas déjà terminal)
 *  - Crée une Notification in-app pour le formateur principal de la cohorte
 *  - Envoie un email d'alerte au formateur via emailService
 *
 * Rate limit : 3 alertes / progression / jour, debounce 2s côté serveur.
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { sendBlockedAlertEmail } from '~~/server/utils/emailService';

// ─── Validation ───────────────────────────────────────────────────────────────

const AlertBodySchema = z.object({
  message: z
    .string()
    .min(20, { message: 'blocked.errors.messageTooShort' })
    .max(500, { message: 'blocked.errors.messageTooLong' }),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const progressionId = getRouterParam(event, 'progressionId');

  if (!progressionId) {
    throw createError({ statusCode: 400, message: 'Missing progressionId' });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Rate limit : 3 alertes bloquées / progression / 24h
  checkRateLimit(`blocked-alert:${supabaseUser['id']}:${progressionId}`, 3, 24 * 60 * 60 * 1_000);

  // Debounce 2s : évite les multi-clics rapides
  checkRateLimit(`blocked-alert:debounce:${supabaseUser['id']}:${progressionId}`, 1, 2_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true, fullName: true, email: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // ── Body validation ────────────────────────────────────────────────────────
  const body = await readValidatedBody(event, (raw) => AlertBodySchema.safeParse(raw));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: 'blocked.errors.invalidBody',
      data: body.error.flatten(),
    });
  }

  const { message } = body.data;

  // ── Charger la progression ─────────────────────────────────────────────────
  const progression = await prisma.progression.findUnique({
    where: { id: progressionId },
    select: {
      id: true,
      userId: true,
      status: true,
      cohortModule: {
        select: {
          cohorteId: true,
          module: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!progression) {
    throw createError({ statusCode: 404, message: 'blocked.errors.progressionNotFound' });
  }

  // ── Autorisation : uniquement le propriétaire ──────────────────────────────
  if (progression.userId !== dbUser.id) {
    logger.warn(
      { progressionId, userIdHash: hashId(dbUser.id) },
      'blocked.alert.forbidden',
    );
    throw createError({ statusCode: 403, message: 'blocked.errors.forbidden' });
  }

  const moduleTitle = progression.cohortModule.module.title;
  const cohorteId = progression.cohortModule.cohorteId;
  const stagiaireName = dbUser.fullName ?? 'Un stagiaire';

  // ── Idempotence : vérifier si une alerte ouverte existe déjà ──────────────
  const existingAlert = await prisma.alert.findFirst({
    where: {
      userId: dbUser.id,
      kind: 'STAGIAIRE_BLOCKED',
      sourceType: 'progression',
      sourceId: progressionId,
      resolvedAt: null,
    },
    select: { id: true },
  });

  if (existingAlert) {
    logger.warn(
      { progressionId, alertId: existingAlert.id, userIdHash: hashId(dbUser.id) },
      'blocked.alert.duplicate_blocked',
    );
    return {
      alertId: existingAlert.id,
      duplicate: true,
      message: 'blocked.alreadyOpen',
    };
  }

  // ── Créer l'alerte STAGIAIRE_BLOCKED ──────────────────────────────────────
  const alert = await prisma.alert.create({
    data: {
      userId: dbUser.id,
      kind: 'STAGIAIRE_BLOCKED',
      severity: 'HIGH',
      sourceType: 'progression',
      sourceId: progressionId,
      context: {
        message,
        progressionId,
        moduleTitle,
      },
    },
    select: { id: true, createdAt: true },
  });

  logger.info(
    { alertId: alert.id, progressionId, userIdHash: hashId(dbUser.id) },
    'blocked.alert.created',
  );

  // ── Transition progression → BLOQUE (si pas déjà terminal/bloqué) ─────────
  const terminalStatuses = ['VALIDE', 'VALIDE_OVERRIDE', 'BLOQUE'];
  if (!terminalStatuses.includes(progression.status)) {
    await prisma.progression.update({
      where: { id: progressionId },
      data: { status: 'BLOQUE' },
    });
  }

  // ── Notifier le formateur principal ───────────────────────────────────────
  const formateurPrincipal = await prisma.membership.findFirst({
    where: {
      cohorteId,
      role: 'FORMATEUR_PRINCIPAL',
      leftAt: null,
    },
    select: {
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  if (formateurPrincipal) {
    const formateur = formateurPrincipal.user;

    // Notification in-app
    await prisma.notification.create({
      data: {
        userId: formateur.id,
        type: 'ALERT_RAISED',
        title: 'Nouveau stagiaire bloqué',
        body: `${stagiaireName} est bloqué sur le module "${moduleTitle}"`,
        payloadJson: {
          alertId: alert.id,
          progressionId,
          moduleTitle,
          stagiaireName,
        },
      },
    });

    // Email d'alerte (fire & forget — on ne bloque pas la réponse)
    sendBlockedAlertEmail(
      formateur.email,
      formateur.fullName ?? 'Formateur',
      stagiaireName,
      moduleTitle,
      message,
    ).catch((err: unknown) => {
      logger.error({ err, alertId: alert.id }, 'blocked.alert.email_failed');
    });
  } else {
    logger.warn({ cohorteId, progressionId }, 'blocked.alert.no_formateur_found');
  }

  return {
    alertId: alert.id,
    duplicate: false,
    createdAt: alert.createdAt,
  };
});
