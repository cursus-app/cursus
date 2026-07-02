/**
 * GET /api/admin/audit — consultation du journal d'audit unifié.
 *
 * Réservé ADMIN uniquement.
 * Paramètres : actorId, action, entityType, entityId, from, to, cursor, limit (max 100).
 *
 * Ref : ST-08.4 — TT-08.4.3
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

const QuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  if (dbUser.globalRole !== 'ADMIN') {
    logger.warn(
      { userIdHash: hashId(dbUser.id), role: dbUser.globalRole },
      'audit.admin.forbidden',
    );
    throw createError({ statusCode: 403, message: 'Admin access required' });
  }

  const query = await getValidatedQuery(event, (raw) => QuerySchema.parse(raw));

  const where: Prisma.AuditLogWhereInput = {};

  if (query.actorId) {
    where.actorId = query.actorId;
  }
  if (query.action) {
    where.action = { contains: query.action };
  }
  if (query.entityType) {
    where.entityType = query.entityType;
  }
  if (query.entityId) {
    where.entityId = query.entityId;
  }
  if (query.from ?? query.to) {
    where.createdAt = {};
    if (query.from) {
      where.createdAt.gte = new Date(query.from);
    }
    if (query.to) {
      where.createdAt.lte = new Date(query.to);
    }
  }

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      diff: true,
      metadata: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      actor: {
        select: { id: true, fullName: true },
      },
    },
  });

  const hasMore = entries.length > query.limit;
  const items = hasMore ? entries.slice(0, query.limit) : entries;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  logger.info(
    { actorIdHash: hashId(dbUser.id), count: items.length, hasMore },
    'audit.admin.queried',
  );

  return { items, nextCursor };
});
