/**
 * PATCH /api/notifications/read-all — marquer toutes les notifications non lues comme lues.
 *
 * RLS : scope limité à l'utilisateur connecté.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }
  const userId = supabaseUser['id'] as string;

  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  logger.info({ userId, count: result.count }, 'notifications.read_all');

  return { markedRead: result.count };
});
