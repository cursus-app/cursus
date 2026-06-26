/**
 * DELETE /api/notifications/:id — supprimer une notification.
 *
 * RLS : vérifie que la notification appartient à l'utilisateur connecté.
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
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing notification id' });
  }

  // Vérifier l'existence et l'appartenance
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw createError({ statusCode: 404, message: 'Notification not found' });
  }

  if (notification.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  await prisma.notification.delete({ where: { id } });

  logger.info({ notificationId: id }, 'notification.deleted');

  return { deleted: true };
});
