/**
 * POST /api/profile/github-connect
 * Stocke le github_handle après le retour OAuth GitHub via Supabase.
 * Appelé par la page /auth/callback après que Supabase a établi la session.
 */
import { serverSupabaseUser } from '#supabase/server';
import { z } from 'zod';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const githubConnectSchema = z.object({
  // Regex validant un login GitHub : 1-39 chars, alphanumérique + tirets,
  // ni commençant ni finissant par un tiret.
  githubHandle: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'auth.github.handleInvalid'),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401 });
  }

  const userId = user['id'];

  const body = await readValidatedBody(event, (raw) => githubConnectSchema.parse(raw));

  // Vérifier que ce handle n'est pas déjà utilisé par un autre compte
  const existing = await prisma.user.findFirst({
    where: { githubHandle: body.githubHandle, id: { not: userId } },
  });

  if (existing) {
    logger.warn({ userId }, 'auth.github.handle_conflict');
    throw createError({
      statusCode: 409,
      message: 'auth.github.handleAlreadyLinked',
    });
  }

  // Lire l'ancien handle pour détecter un changement (audit log)
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubHandle: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { githubHandle: body.githubHandle },
  });

  logger.info({ userId }, 'auth.github.connected');

  // Audit log : changement de handle (handle précédent non loggué — semi-PII)
  if (previous?.githubHandle && previous.githubHandle !== body.githubHandle) {
    logger.warn({ userId }, 'auth.github.handle_changed');
  }

  return { githubHandle: body.githubHandle };
});
