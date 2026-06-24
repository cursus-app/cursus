/**
 * POST /api/invitations
 * Crée une invitation JWT signée et envoie l'email.
 * Réservé aux FORMATEUR_PRINCIPAL, CO_FORMATEUR de la cohorte, ou ADMIN global.
 *
 * Cf. ST-02.2 TT-02.2.1 — Endpoint POST /api/invitations (formateur only, RLS check).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { signInvitationToken } from '~~/server/utils/invitationToken';
import { sendInvitationEmail } from '~~/server/utils/emailService';
import { createInvitationSchema } from '~~/shared/schemas/invitation';
import { createHash } from 'node:crypto';

export default defineEventHandler(async (event) => {
  // Authentification — l'utilisateur doit être connecté
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: 'invitation.unauthorized' });
  }

  // Validation du body via Zod
  const body = await readValidatedBody(event, (raw) => createInvitationSchema.parse(raw));

  const userId = user['id'];

  // Vérifier les droits : formateur de la cohorte ou admin global
  const [senderMembership, senderUser] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId,
        cohorteId: body.cohorteId,
        leftAt: null,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true, fullName: true },
    }),
  ]);

  if (!senderMembership && senderUser?.globalRole !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'invitation.unauthorized' });
  }

  // Vérifier l'absence d'invitation pending pour cet email + cohorte
  const existing = await prisma.invitation.findFirst({
    where: {
      email: body.email,
      cohorteId: body.cohorteId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    throw createError({ statusCode: 409, message: 'invitation.alreadyPending' });
  }

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);

  // Créer l'invitation en DB avec un token placeholder (mis à jour après signature)
  // On utilise le role mappé vers UserRole (schéma existant)
  const roleAsUserRole = body.role as 'STAGIAIRE' | 'CO_FORMATEUR';

  const cohorte = await prisma.cohorte.findUnique({
    where: { id: body.cohorteId },
    select: { name: true },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'invitation.cohorteNotFound' });
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: body.email,
      cohorteId: body.cohorteId,
      role: roleAsUserRole,
      token: 'PENDING',
      expiresAt,
      invitedById: userId,
    },
  });

  // Signer le token JWT avec l'ID de l'invitation (usage unique garanti par DB)
  const token = await signInvitationToken(
    {
      email: body.email,
      cohorteId: body.cohorteId,
      role: body.role,
      invitationId: invitation.id,
    },
    body.expiresInDays,
  );

  // Persister le token signé en DB
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { token },
  });

  // Construire le lien d'invitation
  const baseUrl = process.env['NUXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
  const invitationLink = `${baseUrl}/invite/${encodeURIComponent(token)}`;

  // Envoyer l'email (stub dev, ST-12.x en prod)
  await sendInvitationEmail(body.email, invitationLink, {
    senderName: senderUser?.fullName ?? 'Un formateur',
    cohorteName: cohorte.name,
    role: body.role,
    expiresInDays: body.expiresInDays,
  });

  const emailHash = createHash('sha256').update(body.email).digest('hex').slice(0, 8);
  logger.info(
    { invitationId: invitation.id, cohorteId: body.cohorteId, emailHash },
    'invitation.sent',
  );

  return {
    id: invitation.id,
    expiresAt: invitation.expiresAt,
    // Lien retourné uniquement en dev pour faciliter les tests sans boîte mail
    ...(process.env['NODE_ENV'] !== 'production' ? { devLink: invitationLink } : {}),
  };
});
