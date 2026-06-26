/**
 * POST /api/cursus/:id/modules/:moduleId/og
 * Scrape les métadonnées Open Graph d'une URL de ressource.
 *
 * - Auth : formateur propriétaire du cursus ou admin.
 * - Rate limit : 60 requêtes / formateur / heure.
 * - SSRF protection : via ogScraper.assertNotPrivateUrl.
 * - Timeout : 10s (encapsulé dans scrapeOgMetadata).
 *
 * Cf. ST-03.3 TT-03.3.2.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { scrapeOgMetadata } from '~~/server/utils/ogScraper';
import { ogScrapeRequestSchema } from '~~/shared/schemas/module';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');
  const moduleId = getRouterParam(event, 'moduleId');

  if (!cursusId || !moduleId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id or module id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  // Rate limit : 60 scrapes OG / formateur / heure (opération lente + externe)
  checkRateLimit(`og:scrape:${supabaseUser['id']}`, 60, 60 * 60 * 1_000);

  const [dbUser, module_] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        cursusId: true,
        cursus: { select: { ownerId: true } },
      },
    }),
  ]);

  if (!module_ || module_.cursusId !== cursusId) {
    throw createError({ statusCode: 404, message: 'module.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === module_.cursus.ownerId;

  if (!isAdmin && !isOwner) {
    throw createError({ statusCode: 403, message: 'module.errors.forbidden' });
  }

  const body = await readValidatedBody(event, (raw) => ogScrapeRequestSchema.parse(raw));

  try {
    const og = await scrapeOgMetadata(body.url);
    logger.info(
      { moduleId, cursusId, userIdHash: hashId(supabaseUser['id']) },
      'resource.og.scraped',
    );
    return og;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors du scraping OG';

    // SSRF ou URL invalide → 422 Unprocessable
    if (
      message.includes('SSRF') ||
      message.includes('privée') ||
      message.includes('autorisés')
    ) {
      throw createError({ statusCode: 422, message });
    }

    // Timeout → 504
    if (message.includes('timeout')) {
      throw createError({ statusCode: 504, message });
    }

    // Autres erreurs (réseau, 4xx/5xx serveur cible) → 502
    throw createError({ statusCode: 502, message });
  }
});
