/**
 * POST /api/profile/github-disconnect
 * Efface le github_handle du profil utilisateur.
 * Supabase ne supporte pas le "unlink" de provider OAuth natif —
 * on supprime simplement la colonne en DB.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401 });
  }

  const userId = user['id'];

  await prisma.user.update({
    where: { id: userId },
    data: { githubHandle: null },
  });

  logger.warn({ userId }, 'auth.github.disconnected');

  return { success: true };
});
