/**
 * POST /api/cursus — création d'un nouveau cursus en brouillon (DRAFT).
 *
 * Réservé aux formateurs (principal ou co) et aux admins.
 * Le slug est auto-généré depuis le titre si absent.
 */
import { serverSupabaseUser } from '#supabase/server';
import { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { createCursusSchema } from '~~/shared/schemas/cursus';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';

/**
 * Transforme un titre en slug URL-safe.
 * Normalise les diacritiques, supprime les caractères spéciaux, remplace les
 * espaces par des tirets, tronque à 80 caractères.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Résout un slug unique en ajoutant un suffixe numérique si le slug existe déjà.
 * Ex. : "mon-cursus" → "mon-cursus-2" → "mon-cursus-3"…
 */
async function resolveUniqueSlug(base: string): Promise<string> {
  const existing = await prisma.cursus.findUnique({
    where: { slug: base },
    select: { id: true },
  });

  if (!existing) {
    return base;
  }

  // Essayer avec des suffixes numériques jusqu'à trouver un slug libre.
  for (let i = 2; i <= 100; i++) {
    const candidate = `${base.slice(0, 77)}-${i}`;
    const conflict = await prisma.cursus.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!conflict) {
      return candidate;
    }
  }

  // Fallback avec timestamp (extrêmement improbable d'arriver ici).
  return `${base.slice(0, 68)}-${Date.now()}`;
}

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cursus:create:${supabaseUser['id']}`, 10, 60 * 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const allowedRoles = ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR', 'ADMIN'] as const;
  const isAllowed = allowedRoles.some((r) => r === dbUser.globalRole);

  if (!isAllowed) {
    logger.warn(
      { userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'cursus.create.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => createCursusSchema.parse(raw));

  // Générer ou valider le slug.
  const rawSlug = body.slug ?? slugify(body.title);
  const slug = await resolveUniqueSlug(rawSlug);

  let cursus;
  try {
    cursus = await prisma.cursus.create({
      data: {
        title: body.title,
        slug,
        domain: body.domain,
        level: body.level,
        durationWeeks: body.durationWeeks,
        description: body.description ?? null,
        prerequisites: body.prerequisites ?? null,
        status: 'DRAFT',
        ownerId: dbUser.id,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'cursus.errors.slugTaken' });
    }
    throw err;
  }

  logger.info(
    { cursusId: cursus.id, userIdHash: hashId(dbUser.id) },
    'cursus.created',
  );

  return cursus;
});
