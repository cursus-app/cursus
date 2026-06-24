// POST /api/me/delete — ST-15.2 : Droit à l'oubli — demande de suppression de compte.
//
// Sécurité :
//  - Auth Supabase requise (sinon 401)
//  - Validation body Zod : { confirmation: "SUPPRIMER MON COMPTE" } (sinon 400)
//  - Rate limit : 1 tentative / heure (anti-bruteforce)
//  - La suppression n'est PAS immédiate — job Inngest planifié après délai de grâce
//
// Réponse : { queued: true, message: "Suppression programmée sous 24h" }
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { inngest } from '~~/server/utils/inngest';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { GdprDeleteRequestSchema } from '~~/shared/schemas/gdpr';
import type { GdprQueuedResponse } from '~~/shared/schemas/gdpr';
import { randomUUID } from 'node:crypto';

// Rate limit simple en mémoire (par process). En production, utiliser Upstash Redis.
// Cf. CLAUDE.md §Sécurité — rate limiting sur endpoints sensibles.
const deletionAttempts = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 heure

function checkRateLimit(userId: string): void {
  const lastAttempt = deletionAttempts.get(userId);
  const now = Date.now();
  if (lastAttempt !== undefined && now - lastAttempt < RATE_LIMIT_MS) {
    const remainingMin = Math.ceil((RATE_LIMIT_MS - (now - lastAttempt)) / 60_000);
    throw createError({
      statusCode: 429,
      statusMessage: `Trop de tentatives. Réessayez dans ${remainingMin} minute(s).`,
    });
  }
  deletionAttempts.set(userId, now);
}

export default defineEventHandler(async (event): Promise<GdprQueuedResponse> => {
  // --- Auth ---
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' });
  }

  const userId = supabaseUser['id'];
  const uid = hashId(userId);

  // --- Rate limit ---
  checkRateLimit(userId);

  // --- Validation body ---
  const body = await readBody(event);
  const parseResult = GdprDeleteRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    throw createError({
      statusCode: 400,
      statusMessage: firstError?.message ?? 'Confirmation invalide',
    });
  }

  // --- Vérifier que le compte existe et n'est pas déjà en cours de suppression ---
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountStatus: true },
  });

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' });
  }

  if (user.accountStatus === 'PENDING_DELETION') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Une demande de suppression est déjà en cours.',
    });
  }

  if (user.accountStatus === 'SUSPENDED') {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Votre compte est suspendu. Contactez le support pour procéder à la suppression.',
    });
  }

  // --- Générer un token d'annulation (JWT simplifié = UUID signable) ---
  const cancelToken = randomUUID();
  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // T+7j

  // --- Passer le compte en PENDING_DELETION ---
  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'PENDING_DELETION',
      deletionScheduledAt: scheduledAt,
      deletionCancelToken: cancelToken,
    },
  });

  // --- Enqueue job Inngest avec délai ---
  await inngest.send({
    name: 'gdpr/delete.user',
    data: { userId },
    // Inngest supporte le scheduling via `ts` (timestamp en ms)
    ts: scheduledAt.getTime(),
  });

  logger.info(
    { uid, event: 'gdpr.deletion.requested', scheduledAt: scheduledAt.toISOString() },
    'Suppression RGPD demandée',
  );

  return {
    queued: true,
    message:
      'Votre demande de suppression a été enregistrée. Votre compte sera supprimé dans 7 jours. Vous pouvez annuler depuis vos paramètres.',
  };
});
