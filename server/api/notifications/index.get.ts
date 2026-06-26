/**
 * GET /api/notifications — liste paginée des notifications de l'utilisateur connecté.
 *
 * Query params:
 *   - page?: number (défaut 1)
 *   - perPage?: number (défaut 20, max 100)
 *   - unreadOnly?: boolean
 *
 * RLS : userId filtré sur l'id de l'utilisateur connecté — un user ne voit que ses notifs.
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }
  const userId = supabaseUser['id'] as string;

  const rawQuery = getQuery(event);
  const parsed = QuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query parameters' });
  }

  const { page, perPage, unreadOnly } = parsed.data;
  const skip = (page - 1) * perPage;

  const where = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  } as const;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  logger.info({ userId, total, page }, 'notifications.list');

  return {
    data: notifications,
    meta: {
      total,
      unreadCount,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
});
