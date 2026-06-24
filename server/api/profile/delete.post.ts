/**
 * POST /api/profile/delete — demande de suppression de compte (soft-delete + 30 jours).
 *
 * Flow RGPD :
 *  1. Vérifie que l'email correspond à l'utilisateur authentifié (anti-confusion).
 *  2. Re-authentifie via Supabase (confirmation mdp) pour élever l'assurance.
 *  3. Marque `deletedAt` = now + 30 jours (purge différée côté cron EP-15).
 *  4. Déconnecte l'utilisateur immédiatement.
 *
 * Cas limites traités :
 *  - Email ne correspond pas → 400 profile.delete.emailMismatch
 *  - Mot de passe invalide → 401 profile.delete.passwordInvalid
 *
 * Non implémenté ici (hors scope ST-02.6) :
 *  - Blocage si dernier admin unique (EP-05)
 *  - Email de confirmation avec lien d'annulation (EP-09)
 *  - Purge réelle des données après 30 jours (EP-15)
 *
 * Requiert une session Supabase valide.
 */
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { deleteAccountSchema } from '~~/shared/schemas/profile';
import { createHash } from 'node:crypto';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (raw) => deleteAccountSchema.parse(raw));

  // Vérifier que l'email saisi correspond bien à celui de l'utilisateur authentifié.
  // Protection contre les confusions accidentelles (mauvais compte ouvert).
  if (body.email !== supabaseUser.email) {
    throw createError({ statusCode: 400, message: 'profile.delete.emailMismatch' });
  }

  // Re-authentification obligatoire (confirmation forte) avant soft-delete.
  // On utilise `serverSupabaseClient` avec les droits de la session courante.
  const supabase = await serverSupabaseClient(event);
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (authError) {
    throw createError({ statusCode: 401, message: 'profile.delete.passwordInvalid' });
  }

  // Soft-delete : on stocke la date de suppression effective dans 30 jours.
  // Le cron EP-15 purgera les comptes dont `deletedAt` est dépassé.
  const scheduledDeletion = new Date();
  scheduledDeletion.setDate(scheduledDeletion.getDate() + 30);

  await prisma.user.update({
    where: { id: supabaseUser['id'] },
    data: { deletedAt: scheduledDeletion },
  });

  // Déconnexion immédiate après marquage.
  await supabase.auth.signOut();

  // Log avec email haché (pas de PII en clair dans les logs).
  const emailHash = createHash('sha256').update(body.email).digest('hex');
  logger.warn(
    { userId: supabaseUser['id'], emailHash, scheduledFor: scheduledDeletion.toISOString() },
    'user.deletion.scheduled',
  );

  return { scheduledFor: scheduledDeletion.toISOString() };
});
