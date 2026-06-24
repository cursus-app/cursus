/**
 * GET /api/invitations/:token
 * Vérifie un token d'invitation sans le consommer.
 * Retourne le contexte (email, cohorteName, role, expiresAt).
 *
 * Cf. ST-02.2 TT-02.2.2 — Endpoint GET /api/invitations/:token.
 */
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { verifyInvitationToken } from '~~/server/utils/invitationToken';

export default defineEventHandler(async (event) => {
  const rawToken = getRouterParam(event, 'token');
  if (!rawToken) {
    throw createError({ statusCode: 400, message: 'invitation.tokenMissing' });
  }

  const token = decodeURIComponent(rawToken);

  // 1. Vérifier la signature JWT (expiration incluse)
  let payload;
  try {
    payload = await verifyInvitationToken(token);
  } catch {
    logger.warn({ tokenPrefix: token.slice(0, 10) }, 'invitation.token_invalid');
    throw createError({ statusCode: 410, message: 'invitation.expiredOrInvalid' });
  }

  // 2. Vérifier en DB : invitation non consommée et non révoquée
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: payload.invitationId,
      token,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      cohorte: { select: { name: true } },
    },
  });

  if (!invitation) {
    logger.warn({ invitationId: payload.invitationId }, 'invitation.expiredOrInvalid');
    throw createError({ statusCode: 410, message: 'invitation.expiredOrInvalid' });
  }

  return {
    email: invitation.email,
    cohorteName: invitation.cohorte?.name ?? '',
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
});
