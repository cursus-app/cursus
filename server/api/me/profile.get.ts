/**
 * GET /api/me/profile — profil complet de l'utilisateur authentifié.
 *
 * Retourne tous les champs nécessaires à la page /profil :
 * fullName, bio, avatarUrl, locale, timezone, isPublic, publicSlug, twoFaEnabled.
 * Distinct de GET /api/me (qui retourne le contexte RBAC minimal).
 *
 * Requiert une session Supabase valide.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: {
      id: true,
      email: true,
      globalRole: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      locale: true,
      timezone: true,
      isPublic: true,
      publicSlug: true,
      twoFaEnabled: true,
    },
  });

  if (!dbUser) {
    logger.warn({ userId: supabaseUser['id'] }, 'auth.profile.not_found');
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    globalRole: dbUser.globalRole,
    fullName: dbUser.fullName,
    avatarUrl: dbUser.avatarUrl,
    bio: dbUser.bio,
    locale: dbUser.locale,
    timezone: dbUser.timezone,
    isPublic: dbUser.isPublic,
    publicSlug: dbUser.publicSlug,
    twoFaEnabled: dbUser.twoFaEnabled,
  };
});
