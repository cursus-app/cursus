/**
 * PATCH /api/notifications/:id/read — marquer une notification comme lue.
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
    select: { id: true, userId: true, readAt: true },
  });

  if (!notification) {
    throw createError({ statusCode: 404, message: 'Notification not found' });
  }

  if (notification.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  // Déjà lue → retourner sans modification (idempotent)
  if (notification.readAt !== null) {
    return { id, readAt: notification.readAt };
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  logger.info({ notificationId: id }, 'notification.read');

  return { id: updated.id, readAt: updated.readAt };
});
