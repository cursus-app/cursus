// Inngest function : gdpr/delete.user
// ST-15.2 — Droit à l'oubli.
// Effectue la suppression asynchrone et définitive d'un compte utilisateur :
//  1. Vérifie le statut legal_hold (via accountStatus)
//  2. Anonymise les données (audit log)
//  3. Supprime les enregistrements personnels (profil DB via Cascade)
//  4. Supprime le compte Supabase Auth (via admin API)
//
// Retry : max 3 tentatives. Après 3 échecs → Sentry critique (géré par Inngest).
import { inngest } from '~~/server/utils/inngest';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId, stablePseudoId } from '~~/server/utils/hash';

const PSEUDO_SECRET = process.env['CERTIFICATE_SIGNING_KEY'] ?? 'gdpr-pseudo-fallback-secret';

export const gdprDeleteFunction = inngest.createFunction(
  {
    id: 'gdpr-delete-user',
    name: 'RGPD — Suppression compte utilisateur',
    retries: 3,
    // 1 concurrent par user max — évite les race conditions
    concurrency: { limit: 1, key: 'event.data.userId' },
    triggers: [{ event: 'gdpr/delete.user' }],
  },
  async ({ event, step }) => {
    const userId = (event.data as { userId: string }).userId;
    const uid = hashId(userId);

    // --- Étape 1 : Vérifier le statut du compte ---
    const shouldSkip = await step.run('check-account-status', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, accountStatus: true, deletionScheduledAt: true },
      });

      if (!user) {
        logger.warn({ uid }, 'gdpr.delete.user-not-found — job ignoré');
        return true;
      }

      if (user.accountStatus === 'SUSPENDED') {
        // SUSPENDED = legal hold — on ne supprime pas
        throw new Error(`Compte ${uid} en legal hold (SUSPENDED) — suppression refusée.`);
      }

      if (user.accountStatus !== 'PENDING_DELETION') {
        // L'user a peut-être annulé entre-temps
        logger.info(
          { uid, accountStatus: user.accountStatus },
          'gdpr.delete.cancelled-by-status-change',
        );
        return true;
      }

      return false;
    });

    if (shouldSkip) {
      return { skipped: true };
    }

    // --- Étape 2 : Anonymiser l'audit log ---
    const pseudoId = stablePseudoId(userId, PSEUDO_SECRET);

    await step.run('anonymize-audit-log', async () => {
      const updated = await prisma.auditLog.updateMany({
        where: { actorId: userId },
        data: { actorId: pseudoId },
      });
      logger.info({ uid, updatedCount: updated.count }, 'gdpr.delete.audit-log-anonymized');
      return { count: updated.count };
    });

    // --- Étape 3 : Supprimer les données personnelles via transaction ---
    await step.run('delete-personal-data', async () => {
      // Prisma $transaction garantit l'atomicité.
      // onDelete: Cascade gère déjà notifications, alerts, badges, memberships,
      // quiz attempts, submissions (avec leurs harness runs) — pas besoin de les
      // supprimer manuellement.
      await prisma.$transaction([
        // Supprimer les jobs d'export RGPD liés
        prisma.gdprExportJob.deleteMany({ where: { userId } }),
        // Supprimer le profil (déclenche les Cascades sur les relations)
        prisma.user.delete({ where: { id: userId } }),
      ]);

      logger.info({ uid }, 'gdpr.delete.personal-data-deleted');
    });

    // --- Étape 4 : Supprimer le compte Supabase Auth ---
    await step.run('delete-supabase-auth', async () => {
      const supabaseUrl = process.env['NUXT_PUBLIC_SUPABASE_URL'] ?? '';
      const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

      if (!supabaseUrl || !serviceKey) {
        logger.warn({ uid }, 'gdpr.delete.supabase-auth-skipped — config manquante (dev/test)');
        return { skipped: true };
      }

      // Appel direct à l'API Admin Supabase via fetch (pas de client JS côté serveur
      // avec service role dans ce contexte Inngest — on évite le module @nuxtjs/supabase
      // qui est client-side).
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supabase Auth delete failed (${res.status}): ${body}`);
      }

      logger.info({ uid }, 'gdpr.delete.supabase-auth-deleted');
      return { deleted: true };
    });

    logger.info({ uid, event: 'gdpr.deletion.completed', pseudoId }, 'Suppression RGPD complète');

    return {
      success: true,
      completedAt: new Date().toISOString(),
    };
  },
);
