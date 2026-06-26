/**
 * POST /api/invitations/:id/resend — renvoi d'une invitation existante.
 *
 * Re-envoie l'email d'invitation via Supabase Admin et prolonge l'expiration.
 * Bloqué si l'invitation est déjà acceptée ou révoquée.
 *
 * Auth : FORMATEUR_PRINCIPAL (global ou dans la cohorte liée) ou ADMIN.
 *
 * Cf. ST-04.2 — TT-04.2.4.
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashEmail, hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const invitationId = getRouterParam(event, 'id');

  if (!invitationId) {
    throw createError({ statusCode: 400, message: 'Missing invitation id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`invitations:resend:${supabaseUser['id']}`, 20, 60 * 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      cohorteId: true,
      acceptedAt: true,
      revokedAt: true,
    },
  });

  if (!invitation) {
    throw createError({ statusCode: 404, message: 'invitations.errors.notFound' });
  }

  if (invitation.acceptedAt) {
    throw createError({ statusCode: 422, message: 'invitations.errors.alreadyAccepted' });
  }

  if (invitation.revokedAt) {
    throw createError({ statusCode: 422, message: 'invitations.errors.revoked' });
  }

  // Auth : ADMIN ou FORMATEUR_PRINCIPAL (global ou dans la cohorte liée)
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isGlobalFormateur = dbUser.globalRole === 'FORMATEUR_PRINCIPAL';

  if (!isAdmin && !isGlobalFormateur) {
    if (invitation.cohorteId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: dbUser.id,
          cohorteId: invitation.cohorteId,
          role: 'FORMATEUR_PRINCIPAL',
        },
        select: { id: true },
      });
      if (!membership) {
        logger.warn({ userIdHash: hashId(dbUser.id), invitationId }, 'invitation.resend.forbidden');
        throw createError({ statusCode: 403, message: 'invitations.errors.forbidden' });
      }
    } else {
      throw createError({ statusCode: 403, message: 'invitations.errors.forbidden' });
    }
  }

  const supabaseAdmin = serverSupabaseServiceRole(event);
  const siteUrl = process.env['NUXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
  const redirectTo = invitation.cohorteId
    ? `${siteUrl}/auth/accept-invitation?cohorte=${invitation.cohorteId}`
    : `${siteUrl}/auth/accept-invitation`;

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo,
  });

  if (error) {
    logger.warn(
      {
        emailHash: hashEmail(invitation.email),
        invitationId,
        errorCode: error.code,
      },
      'invitation.resend.supabase_warn',
    );
  }

  // Prolonger l'expiration à 7 jours depuis maintenant
  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
    },
  });

  logger.info(
    {
      invitationId,
      emailHash: hashEmail(invitation.email),
      cohorteId: invitation.cohorteId,
      userIdHash: hashId(dbUser.id),
    },
    'invitation.resend.sent',
  );

  return { success: true };
});
