/**
 * GET /api/me — profil utilisateur authentifié avec rôle global et memberships actifs.
 *
 * Utilisé par le middleware auth.global.ts pour hydrater le store Pinia RBAC.
 * Requiert une session Supabase valide (JWT vérifié côté serveur).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

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
      theme: true,
      memberships: {
        where: { leftAt: null },
        select: {
          cohorteId: true,
          role: true,
          cohorte: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!dbUser) {
    // L'utilisateur existe dans Supabase Auth mais pas encore dans notre DB.
    // (ex. : provisioning asynchrone pas encore complété)
    logger.warn({ userIdHash: hashId(supabaseUser['id']) }, 'auth.profile.not_found');
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    globalRole: dbUser.globalRole,
    theme: dbUser.theme,
    memberships: dbUser.memberships.map((m) => ({
      cohorteId: m.cohorteId,
      role: m.role,
      cohorte: m.cohorte,
    })),
  };
});
