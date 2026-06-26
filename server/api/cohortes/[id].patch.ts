/**
 * PATCH /api/cohortes/:id — mise à jour des champs d'une cohorte.
 *
 * Interdit si la cohorte n'est pas en DRAFT.
 * Réservé au formateur principal ou à un admin.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { cohorteUpdateSchema } from '~~/shared/schemas/cohorte';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:patch:${supabaseUser['id']}`, 20, 60 * 1_000);

  const [dbUser, cohorte] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cohorte.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        memberships: {
          where: { role: 'FORMATEUR_PRINCIPAL' },
          select: { userId: true },
        },
      },
    }),
  ]);

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwnerFormateur = cohorte.memberships.some((m) => m.userId === dbUser?.id);

  if (!isAdmin && !isOwnerFormateur) {
    logger.warn(
      { cohorteId: id, userIdHash: hashId(supabaseUser['id']) },
      'cohorte.patch.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  if (cohorte.status !== 'DRAFT') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.cannotEditNonDraft' });
  }

  const body = await readValidatedBody(event, (raw) => cohorteUpdateSchema.parse(raw));

  type CohorteData = {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    rhythm?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  };
  const data: CohorteData = {};

  if (body.name !== undefined) {
    data.name = body.name;
  }
  if (body.startDate !== undefined) {
    data.startDate = new Date(body.startDate);
  }
  if (body.endDate !== undefined) {
    data.endDate = new Date(body.endDate);
  }
  if (body.rhythm !== undefined) {
    data.rhythm = body.rhythm;
  }

  const updated = await prisma.cohorte.update({
    where: { id },
    data,
  });

  logger.info({ cohorteId: id, userIdHash: hashId(supabaseUser['id']) }, 'cohorte.updated');

  return updated;
});
