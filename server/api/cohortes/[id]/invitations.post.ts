/**
 * POST /api/cohortes/:id/invitations — invitation batch de stagiaires.
 *
 * Accepte `{ emails: string[] }` (1 à 50 emails).
 * - Déduplique emails déjà membres ou déjà invités (actifs) de la cohorte.
 * - Appelle Supabase Admin `inviteUserByEmail` pour chaque nouvel email.
 * - Crée un enregistrement `Invitation` en DB pour le suivi.
 * - Rate limit : 50 invitations/h/formateur (via checkRateLimitBulk).
 *
 * Auth : FORMATEUR_PRINCIPAL (global ou dans la cohorte) ou ADMIN.
 *
 * Cf. ST-04.2 — TT-04.2.1.
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashEmail, hashId } from '~~/server/utils/hash';
import { checkRateLimitBulk } from '~~/server/utils/inMemoryRateLimit';
import { inviteBatchSchema } from '~~/shared/schemas/invitation';
import { randomUUID } from 'node:crypto';

export default defineEventHandler(async (event) => {
  const cohorteId = getRouterParam(event, 'id');

  if (!cohorteId) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (raw) => inviteBatchSchema.parse(raw));

  // Rate limit : 50 invitations/h/formateur (atomique sur le batch)
  checkRateLimitBulk(
    `invitations:batch:${supabaseUser['id']}`,
    body.emails.length,
    50,
    60 * 60 * 1_000,
  );

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Auth : ADMIN ou FORMATEUR_PRINCIPAL (global ou dans la cohorte)
  const isAdmin = dbUser.globalRole === 'ADMIN';
  const isGlobalFormateur = dbUser.globalRole === 'FORMATEUR_PRINCIPAL';

  if (!isAdmin && !isGlobalFormateur) {
    const membership = await prisma.membership.findFirst({
      where: { userId: dbUser.id, cohorteId, role: 'FORMATEUR_PRINCIPAL' },
      select: { id: true },
    });
    if (!membership) {
      logger.warn(
        { userIdHash: hashId(dbUser.id), cohorteId },
        'invitation.batch.forbidden',
      );
      throw createError({ statusCode: 403, message: 'invitations.errors.forbidden' });
    }
  }

  // Vérifier que la cohorte existe
  const cohorte = await prisma.cohorte.findUnique({
    where: { id: cohorteId },
    select: { id: true },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  // Déduplique les emails dans la même requête (insensible à la casse)
  const uniqueEmails = [...new Set(body.emails.map((e) => e.toLowerCase().trim()))];

  // Charger les utilisateurs existants pour trouver les déjà-membres
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: uniqueEmails } },
    select: { id: true, email: true },
  });

  const existingUsersByEmail = new Map(
    existingUsers.map((u: { id: string; email: string }) => [u.email.toLowerCase(), u.id]),
  );

  const existingMemberships = await prisma.membership.findMany({
    where: {
      cohorteId,
      userId: { in: existingUsers.map((u: { id: string; email: string }) => u.id) },
    },
    select: { userId: true },
  });

  const existingMemberIds = new Set(
    existingMemberships.map((m: { userId: string }) => m.userId),
  );

  // Invitations actives (non acceptées, non révoquées, non expirées)
  const existingInvitations = await prisma.invitation.findMany({
    where: {
      cohorteId,
      email: { in: uniqueEmails },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { email: true },
  });

  const alreadyInvitedEmails = new Set(
    existingInvitations.map((i: { email: string }) => i.email.toLowerCase()),
  );

  const invited: string[] = [];
  const deduplicated: string[] = [];

  const supabaseAdmin = serverSupabaseServiceRole(event);
  const siteUrl = process.env['NUXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

  for (const email of uniqueEmails) {
    // Déjà membre de la cohorte ?
    const userId = existingUsersByEmail.get(email);
    if (userId !== undefined && existingMemberIds.has(userId)) {
      deduplicated.push(email);
      logger.info(
        { emailHash: hashEmail(email), cohorteId },
        'invitation.batch.deduplicated',
      );
      continue;
    }

    // Déjà invitation active pour cette cohorte ?
    if (alreadyInvitedEmails.has(email)) {
      deduplicated.push(email);
      logger.info(
        { emailHash: hashEmail(email), cohorteId },
        'invitation.batch.deduplicated',
      );
      continue;
    }

    // Envoyer l'invitation via Supabase Auth Admin
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/accept-invitation?cohorte=${cohorteId}`,
    });

    if (error) {
      // Supabase peut retourner une erreur si l'utilisateur est déjà inscrit
      // avec un compte confirmé — on logue et on continue (l'invitation DB sert de suivi)
      logger.warn(
        { emailHash: hashEmail(email), cohorteId, errorCode: error.code },
        'invitation.supabase.warn',
      );
    }

    // Créer l'invitation en DB pour le suivi et les renvois ultérieurs
    await prisma.invitation.create({
      data: {
        email,
        token: randomUUID(),
        role: 'STAGIAIRE',
        cohorteId,
        invitedById: dbUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000), // 7 jours
      },
    });

    invited.push(email);
  }

  logger.info(
    {
      cohorteId,
      userIdHash: hashId(dbUser.id),
      invited: invited.length,
      deduplicated: deduplicated.length,
      total: uniqueEmails.length,
    },
    'invitation.batch.sent',
  );

  return {
    invited,
    deduplicated,
    total: uniqueEmails.length,
  };
});
