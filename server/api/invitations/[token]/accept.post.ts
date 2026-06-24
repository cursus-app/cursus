/**
 * POST /api/invitations/:token/accept
 * Consomme un token d'invitation (usage unique) et crée le compte utilisateur.
 *
 * Race condition gérée via updateMany avec double guard sur acceptedAt: null.
 * Si deux requêtes simultanées arrivent, seule la première réussit l'update.
 *
 * Cf. ST-02.2 TT-02.2.3 — Endpoint POST /api/invitations/:token/accept.
 */
import { serverSupabaseClient } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { verifyInvitationToken } from '~~/server/utils/invitationToken';
import { acceptInvitationSchema } from '~~/shared/schemas/invitation';

export default defineEventHandler(async (event) => {
  const rawToken = getRouterParam(event, 'token');
  if (!rawToken) {
    throw createError({ statusCode: 400, message: 'invitation.tokenMissing' });
  }

  const token = decodeURIComponent(rawToken);

  // Valider le body (password + fullName optionnel)
  const body = await readValidatedBody(event, (raw) => acceptInvitationSchema.parse(raw));

  // 1. Vérifier la signature JWT + expiration
  let payload;
  try {
    payload = await verifyInvitationToken(token);
  } catch {
    logger.warn({ tokenPrefix: token.slice(0, 10) }, 'invitation.token_invalid');
    throw createError({ statusCode: 410, message: 'invitation.expiredOrInvalid' });
  }

  // 2. Vérifier en DB que l'invitation est valide et non consommée
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: payload.invitationId,
      token,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invitation) {
    throw createError({ statusCode: 410, message: 'invitation.expiredOrInvalid' });
  }

  // 3. Marquer l'invitation comme acceptée AVANT de créer le compte Supabase
  // Double guard (acceptedAt: null) — protège contre les race conditions.
  const updated = await prisma.invitation.updateMany({
    where: {
      id: invitation.id,
      acceptedAt: null, // Double guard anti-race
    },
    data: { acceptedAt: new Date() },
  });

  if (updated.count === 0) {
    throw createError({ statusCode: 409, message: 'invitation.alreadyAccepted' });
  }

  // 4. Créer le compte Supabase Auth
  const supabase = await serverSupabaseClient(event);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: body.password,
    options: {
      data: { full_name: body.fullName ?? null },
    },
  });

  if (authError || !authData.user) {
    // Rollback : remettre l'invitation en état pending pour permettre une nouvelle tentative
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: null },
    });
    logger.error({ invitationId: invitation.id }, 'invitation.accept.signup_failed');
    throw createError({ statusCode: 500, message: 'invitation.signupFailed' });
  }

  // 5. Créer le profil User en DB + membership dans la cohorte (transaction atomique)
  const roleAsMembershipRole = payload.role as 'STAGIAIRE' | 'CO_FORMATEUR';

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: authData.user.id,
        email: payload.email,
        fullName: body.fullName ?? null,
        // globalRole dérivé du role dans la cohorte
        globalRole: payload.role === 'CO_FORMATEUR' ? 'CO_FORMATEUR' : 'STAGIAIRE',
      },
    }),
    ...(invitation.cohorteId !== null
      ? [
          prisma.membership.create({
            data: {
              userId: authData.user.id,
              cohorteId: invitation.cohorteId,
              role: roleAsMembershipRole,
            },
          }),
        ]
      : []),
  ]);

  logger.info({ userId: authData.user.id, invitationId: invitation.id }, 'invitation.accepted');

  return {
    userId: authData.user.id,
    email: payload.email,
  };
});
