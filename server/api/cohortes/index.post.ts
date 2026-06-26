/**
 * POST /api/cohortes — création d'une cohorte en statut DRAFT.
 *
 * Résout cursusId → dernière CursusVersion publiée.
 * Réservé aux FORMATEUR_PRINCIPAL et ADMIN.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { cohorteCreateSchema } from '~~/shared/schemas/cohorte';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:create:${supabaseUser['id']}`, 20, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const allowedRoles = ['FORMATEUR_PRINCIPAL', 'ADMIN'] as const;
  const isAllowed = allowedRoles.some((r) => r === dbUser.globalRole);

  if (!isAllowed) {
    logger.warn(
      { userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'cohorte.create.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => cohorteCreateSchema.parse(raw));

  // Résoudre cursusId → dernière CursusVersion d'un cursus PUBLISHED
  const cursus = await prisma.cursus.findUnique({
    where: { id: body.cursusId },
    select: { id: true, status: true },
  });

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.cursusNotFound' });
  }

  if (cursus.status !== 'PUBLISHED') {
    throw createError({ statusCode: 422, message: 'cohortes.errors.cursusNotPublished' });
  }

  // Récupérer la version la plus récente (version la plus haute)
  const latestVersion = await prisma.cursusVersion.findFirst({
    where: { cursusId: body.cursusId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  });

  if (!latestVersion) {
    throw createError({ statusCode: 422, message: 'cohortes.errors.noVersionFound' });
  }

  const cohorte = await prisma.cohorte.create({
    data: {
      name: body.name,
      cursusVersionId: latestVersion.id,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      rhythm: body.rhythm,
      status: 'DRAFT',
    },
    include: {
      cursusVersion: {
        include: {
          cursus: {
            select: { id: true, title: true, slug: true },
          },
        },
      },
      _count: { select: { memberships: true } },
    },
  });

  logger.info(
    { cohorteId: cohorte.id, userIdHash: hashId(dbUser.id), cursusVersionId: latestVersion.id },
    'cohorte.created',
  );

  return cohorte;
});
