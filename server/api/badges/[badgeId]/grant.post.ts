/**
 * POST /api/badges/:badgeId/grant
 *
 * Attribution manuelle d'un badge par un formateur.
 *
 * Auth   : FORMATEUR_PRINCIPAL, CO_FORMATEUR ou ADMIN uniquement.
 * Body   : { userId: string (UUID), mention?: string (max 500 chars) }
 * Idémpotent : si le badge est déjà attribué, retourne { ok: true } sans erreur.
 *
 * ST-11.2 — TT-11.2.5
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { createAuditEntry, extractIp } from '~~/server/utils/auditLog';

const GrantBodySchema = z.object({
  userId: z.string().uuid(),
  mention: z.string().max(500).optional(),
});

const BadgeIdSchema = z.string().uuid();

const ALLOWED_ROLES = ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR', 'ADMIN'] as const;

export default defineEventHandler(async (event) => {
  // ── 1. Authentification Supabase ─────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized.' });
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────────────
  checkRateLimit(`badges:grant:${supabaseUser['id']}`, 30, 60 * 1_000);

  // ── 3. Vérification du rôle via la DB ────────────────────────────────────────
  const granter = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!granter) {
    throw createError({ statusCode: 404, message: 'User profile not found.' });
  }

  const isAllowed = ALLOWED_ROLES.some((r) => r === granter.globalRole);
  if (!isAllowed) {
    logger.warn(
      { userIdHash: hashId(granter.id), role: granter.globalRole },
      'badge.grant.forbidden',
    );
    throw createError({ statusCode: 403, message: 'Accès refusé.' });
  }

  // ── 4. Validation du paramètre de route ──────────────────────────────────────
  const rawBadgeId = getRouterParam(event, 'badgeId');
  const badgeIdResult = BadgeIdSchema.safeParse(rawBadgeId);
  if (!badgeIdResult.success) {
    throw createError({ statusCode: 400, message: 'badgeId invalide.' });
  }
  const badgeId = badgeIdResult.data;

  // ── 5. Validation du body ────────────────────────────────────────────────────
  const rawBody = await readBody(event);
  const parseResult = GrantBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload invalide.',
      data: parseResult.error.flatten(),
    });
  }
  const { userId, mention } = parseResult.data;

  // ── 6. Vérifier que le badge existe ──────────────────────────────────────────
  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
    select: { id: true, code: true, name: true },
  });

  if (!badge) {
    throw createError({ statusCode: 404, message: 'Badge introuvable.' });
  }

  // ── 7. Cohorte-level auth: vérifier que userId appartient à une cohorte du formateur
  // Les ADMIN peuvent attribuer à n'importe quel stagiaire.
  if (granter.globalRole !== 'ADMIN') {
    const inSameCohorte = await prisma.membership.findFirst({
      where: {
        userId,
        cohorte: {
          memberships: {
            some: {
              userId: granter.id,
              role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!inSameCohorte) {
      logger.warn(
        { granterIdHash: hashId(granter.id), userIdHash: hashId(userId) },
        'badge.grant.wrong_cohorte',
      );
      throw createError({
        statusCode: 403,
        message: 'Accès refusé : stagiaire hors de votre cohorte.',
      });
    }
  }

  // ── 8. Attribution idémpotente (badge + notification atomiques) ───────────────
  try {
    await prisma.$transaction([
      prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          grantedBy: granter.id,
          mention: mention ?? null,
        },
      }),
      prisma.notification.create({
        data: {
          userId,
          type: 'BADGE_AWARDED',
          title: 'Badge attribué !',
          body: `Tu as reçu le badge "${badge.name}"${mention ? ` : ${mention}` : ''}.`,
        },
      }),
    ]);

    await createAuditEntry({
      actorId: granter.id,
      action: 'badge.grant.manual',
      entityType: 'UserBadge',
      entityId: badge.id,
      metadata: {
        badgeCode: badge.code,
        targetUserIdHash: hashId(userId),
        mention: mention ?? null,
      },
      ipAddress: extractIp(event),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // unique constraint → badge already granted, idempotent
    } else {
      logger.error(
        { granterIdHash: hashId(granter.id), userIdHash: hashId(userId), badgeCode: badge.code },
        'badge.grant.unexpected_error',
      );
      throw err;
    }
  }

  logger.info(
    {
      granterIdHash: hashId(granter.id),
      userIdHash: hashId(userId),
      badgeCode: badge.code,
    },
    'badge.grant.manual',
  );

  return { ok: true };
});
