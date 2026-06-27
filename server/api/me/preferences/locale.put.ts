/**
 * PUT /api/me/preferences/locale — mise à jour de la locale préférée de l'utilisateur.
 *
 * Valeurs acceptées : 'fr' | 'en'.
 * La locale est stockée en DB sur `users.locale` et propagée aux emails/PDFs.
 *
 * Cf. ST-19.4 / TT-19.4.6
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

const localeSchema = z.object({
  locale: z.enum(['fr', 'en']),
});

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (raw) => localeSchema.parse(raw));

  await prisma.user.update({
    where: { id: supabaseUser['id'] },
    data: { locale: body.locale },
  });

  logger.info(
    { userIdHash: hashId(supabaseUser['id']), locale: body.locale },
    'user.preference.locale_changed',
  );

  return { locale: body.locale };
});
