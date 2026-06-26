/**
 * PATCH /api/cursus/:id — mise à jour des champs d'un cursus.
 *
 * Interdit si le cursus est ARCHIVED.
 * Réservé au propriétaire ou à un admin.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { updateCursusSchema } from '~~/shared/schemas/cursus';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cursus:patch:${supabaseUser['id']}`, 60, 60 * 60 * 1_000);

  const [dbUser, cursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true, slug: true },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status === 'ARCHIVED') {
    throw createError({
      statusCode: 422,
      message: 'cursus.errors.cannotEditArchived',
    });
  }

  const body = await readValidatedBody(event, (raw) => updateCursusSchema.parse(raw));

  // Si le slug est modifié, vérifier l'unicité (hors ce cursus).
  if (body.slug && body.slug !== cursus.slug) {
    const slugConflict = await prisma.cursus.findFirst({
      where: { slug: body.slug, id: { not: id } },
      select: { id: true },
    });
    if (slugConflict) {
      throw createError({ statusCode: 409, message: 'cursus.errors.slugTaken' });
    }
  }

  // Construction de l'objet data : uniquement les champs fournis.
  const data: {
    title?: string;
    domain?: string;
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    durationWeeks?: number;
    description?: string;
    prerequisites?: string;
    slug?: string;
  } = {};

  if (body.title !== undefined) {data.title = body.title;}
  if (body.domain !== undefined) {data.domain = body.domain;}
  if (body.level !== undefined) {data.level = body.level;}
  if (body.durationWeeks !== undefined) {data.durationWeeks = body.durationWeeks;}
  if (body.description !== undefined) {data.description = body.description;}
  if (body.prerequisites !== undefined) {data.prerequisites = body.prerequisites;}
  if (body.slug !== undefined) {data.slug = body.slug;}

  const updated = await prisma.cursus.update({
    where: { id },
    data,
  });

  logger.info(
    { cursusId: id, userIdHash: hashId(supabaseUser['id']) },
    'cursus.updated',
  );

  return updated;
});
