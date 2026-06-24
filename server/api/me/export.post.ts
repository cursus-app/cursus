// POST /api/me/export — ST-15.1 : Demande d'export des données personnelles.
//
// Sécurité :
//  - Auth Supabase requise (sinon 401)
//  - Rate limit : 1 demande / 7 jours par user (stocké dans la table users.gdprExportRequestedAt)
//
// Réponse immédiate : { queued: true, message: "..." }
// Le job Inngest `gdpr/export.generate` s'exécute de façon asynchrone.
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { inngest } from '~~/server/utils/inngest';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import type { GdprQueuedResponse } from '~~/shared/schemas/gdpr';

const RATE_LIMIT_DAYS = 7;
const RATE_LIMIT_MS = RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event): Promise<GdprQueuedResponse> => {
  // --- Auth ---
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' });
  }

  const userId = supabaseUser['id'];
  const uid = hashId(userId);

  // L'email de destination vient du JWT Supabase (source de vérité Auth)
  const destinationEmail = String(supabaseUser['email'] ?? '');

  // --- Rate limit : vérifier la dernière demande en DB ---
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gdprExportRequestedAt: true },
  });

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' });
  }

  if (user.gdprExportRequestedAt) {
    const elapsed = Date.now() - user.gdprExportRequestedAt.getTime();
    if (elapsed < RATE_LIMIT_MS) {
      const remainingHours = Math.ceil((RATE_LIMIT_MS - elapsed) / (60 * 60 * 1000));
      throw createError({
        statusCode: 429,
        statusMessage: `Vous avez déjà demandé un export. Réessayez dans ${remainingHours}h.`,
      });
    }
  }

  // --- Marquer la demande en DB + créer le job ---
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { gdprExportRequestedAt: new Date() },
    }),
    prisma.gdprExportJob.create({
      data: { userId, status: 'PROCESSING' },
    }),
  ]);

  // --- Enqueue job Inngest ---
  await inngest.send({
    name: 'gdpr/export.generate',
    data: { userId, destinationEmail },
  });

  logger.info({ uid, event: 'gdpr.export.requested' }, 'Export RGPD demandé');

  return {
    queued: true,
    message: 'Export en cours, vous recevrez un email dans quelques minutes.',
  };
});
