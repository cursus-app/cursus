// POST /api/auth/clear-lockout — Lève le verrouillage après reset par magic-link.
// Cf. ST-15.4 AC3 : "Reset par magic-link lève le lockout automatiquement".
//
// À appeler côté client après un reset de mot de passe Supabase Auth réussi.
// Requiert une session valide (prouve que l'utilisateur a bien complété le reset).

import { serverSupabaseUser } from '#supabase/server';
import { hashEmail } from '~~/server/utils/hash';
import { getLoginAttemptService } from '~~/server/utils/loginAttemptService';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const service = await getLoginAttemptService();
  await service.clearLockout(supabaseUser.email);

  logger.info(
    { emailHash: hashEmail(supabaseUser.email), event: 'auth.lockout.cleared_via_reset' },
    'auth.lockout.cleared_via_reset',
  );

  return { ok: true };
});
