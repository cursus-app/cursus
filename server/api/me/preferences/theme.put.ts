/**
 * PUT /api/me/preferences/theme — synchronise la préférence de thème en DB.
 *
 * Valeurs acceptées : 'light', 'dark', 'system'.
 * Réservé aux utilisateurs authentifiés.
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

const themeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (raw) => themeSchema.parse(raw));

  await prisma.user.update({
    where: { id: supabaseUser['id'] },
    data: { theme: body.theme },
  });

  logger.info(
    { userIdHash: hashId(supabaseUser['id']), theme: body.theme },
    'user.preference.theme_changed',
  );

  return { theme: body.theme };
});
