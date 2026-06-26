/**
 * POST /api/cohortes/:id/co-formateurs
 *
 * Ajoute un co-formateur à la cohorte.
 * Body : { email?: string, userId?: string, moduleIds?: string[] | null }
 *   - email ou userId requis (email prioritaire si les deux fournis)
 *   - moduleIds null/absent → accès global ; string[] → accès limité aux modules
 *
 * Auth : FORMATEUR_PRINCIPAL de la cohorte ou ADMIN.
 * Cf. ST-04.3 — TT-04.3.1
 */
import { Prisma } from '@prisma/client';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId, hashEmail } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { coFormateurAddSchema } from '~~/shared/schemas/cohorte';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:co-formateurs:add:${supabaseUser['id']}`, 30, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Vérifier autorisation : ADMIN ou FORMATEUR_PRINCIPAL de la cohorte
  const isAdmin = dbUser.globalRole === 'ADMIN';

  if (!isAdmin) {
    const membership = await prisma.membership.findUnique({
      where: { userId_cohorteId: { userId: dbUser.id, cohorteId: id } },
      select: { role: true },
    });
    if (membership?.role !== 'FORMATEUR_PRINCIPAL') {
      logger.warn(
        { cohorteId: id, userIdHash: hashId(dbUser.id) },
        'cohorte.co_formateur.add.forbidden',
      );
      throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
    }
  }

  // Vérifier que la cohorte existe
  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const body = await readValidatedBody(event, (raw) => coFormateurAddSchema.parse(raw));

  // Résoudre l'utilisateur cible par email ou userId
  let targetUser: { id: string; globalRole: string | null } | null = null;

  if (body.email !== undefined) {
    targetUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, globalRole: true },
    });
    if (!targetUser) {
      logger.warn(
        { cohorteId: id, emailHash: hashEmail(body.email) },
        'cohorte.co_formateur.add.userNotFound',
      );
      throw createError({ statusCode: 404, message: 'cohortes.errors.userNotFound' });
    }
  } else if (body.userId !== undefined) {
    targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, globalRole: true },
    });
    if (!targetUser) {
      throw createError({ statusCode: 404, message: 'cohortes.errors.userNotFound' });
    }
  }

  // TypeScript guard : l'un ou l'autre est obligatoire (validé par Zod)
  if (!targetUser) {
    throw createError({ statusCode: 400, message: 'cohortes.errors.emailOrUserIdRequired' });
  }

  // Sécurité : un co-formateur ne peut pas s'auto-promouvoir
  // (seul le formateur principal ou admin peut appeler cet endpoint)
  // Vérifier que la cible n'est pas déjà FORMATEUR_PRINCIPAL de cette cohorte
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_cohorteId: { userId: targetUser.id, cohorteId: id } },
    select: { role: true },
  });

  if (existingMembership?.role === 'FORMATEUR_PRINCIPAL') {
    throw createError({
      statusCode: 409,
      message: 'cohortes.errors.alreadyFormateurPrincipal',
    });
  }

  // moduleIds : null → global (NULL en DB), [] ou [uuid...] → limité
  // Prisma.DbNull est requis pour stocker NULL explicitement dans un champ Json?
  const moduleIdsRaw = body.moduleIds ?? null;
  const moduleIdsValue: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    moduleIdsRaw === null ? Prisma.DbNull : moduleIdsRaw;

  let membership;
  if (existingMembership) {
    // L'utilisateur est déjà membre (ex: STAGIAIRE) — upsert vers CO_FORMATEUR
    membership = await prisma.membership.update({
      where: { userId_cohorteId: { userId: targetUser.id, cohorteId: id } },
      data: {
        role: 'CO_FORMATEUR',
        moduleIds: moduleIdsValue,
        leftAt: null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, githubHandle: true, email: true },
        },
      },
    });
  } else {
    // Nouvel ajout
    membership = await prisma.membership.create({
      data: {
        userId: targetUser.id,
        cohorteId: id,
        role: 'CO_FORMATEUR',
        moduleIds: moduleIdsValue,
      },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, githubHandle: true, email: true },
        },
      },
    });
  }

  logger.info(
    {
      cohorteId: id,
      actorIdHash: hashId(dbUser.id),
      targetIdHash: hashId(targetUser.id),
      isGlobal: moduleIdsRaw === null,
      moduleCount: Array.isArray(moduleIdsRaw) ? moduleIdsRaw.length : null,
    },
    'cohorte.co_formateur.added',
  );

  return membership;
});
