/**
 * PATCH /api/profile — mise à jour des champs de profil de l'utilisateur authentifié.
 *
 * Champs modifiables : fullName, bio, locale, timezone, isPublic, publicSlug.
 * Le publicSlug est vérifié en unicité avant mise à jour.
 * Requiert une session Supabase valide.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { updateProfileSchema } from '~~/shared/schemas/profile';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (raw) => updateProfileSchema.parse(raw));

  // Vérifier l'unicité du publicSlug si fourni et non null
  if (body.publicSlug) {
    const existing = await prisma.user.findFirst({
      where: {
        publicSlug: body.publicSlug,
        id: { not: supabaseUser['id'] },
      },
      select: { id: true },
    });

    if (existing) {
      throw createError({ statusCode: 409, message: 'profile.slugTaken' });
    }
  }

  // Construction de l'objet data en ne passant que les champs fournis.
  // `exactOptionalPropertyTypes` interdit d'assigner `undefined` à une propriété
  // qui ne l'accepte pas — on filtre en amont.
  const data: {
    fullName?: string;
    bio?: string;
    locale?: 'fr' | 'en';
    timezone?: string;
    isPublic?: boolean;
    publicSlug?: string | null;
  } = {};

  if (body.fullName !== undefined) {
    data.fullName = body.fullName;
  }
  if (body.bio !== undefined) {
    data.bio = body.bio;
  }
  if (body.locale !== undefined) {
    data.locale = body.locale;
  }
  if (body.timezone !== undefined) {
    data.timezone = body.timezone;
  }
  if (body.isPublic !== undefined) {
    data.isPublic = body.isPublic;
  }
  // publicSlug peut être null (suppression du slug) ou une string (nouveau slug)
  if ('publicSlug' in body) {
    data.publicSlug = body.publicSlug ?? null;
  }

  const updated = await prisma.user.update({
    where: { id: supabaseUser['id'] },
    data,
    select: {
      id: true,
      fullName: true,
      bio: true,
      locale: true,
      timezone: true,
      isPublic: true,
      publicSlug: true,
    },
  });

  logger.info({ userId: supabaseUser['id'] }, 'user.profile.updated');

  return updated;
});
