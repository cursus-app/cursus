/**
 * Inngest scheduled function : check-broken-links
 * ST-03.3 TT-03.3.4 — Job nocturne qui vérifie que les URLs de ressources
 * répondent encore et marque les ressources "broken" si ce n'est pas le cas.
 *
 * Cadence : tous les jours à 2h du matin (UTC).
 * Retry : max 3 tentatives.
 * Concurrence : 5 modules en parallèle max.
 */
import { inngest } from '~~/server/utils/inngest';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { assertNotPrivateUrl } from '~~/server/utils/ogScraper';
import type { Resource } from '~~/shared/schemas/module';

const LINK_CHECK_TIMEOUT_MS = 10_000;
const MAX_RESOURCES_PER_BATCH = 100;

/**
 * Vérifie si une URL répond (HEAD request avec redirect follow).
 * Retourne true si accessible, false sinon.
 */
async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    // SSRF guard — skip internal URLs silently
    assertNotPrivateUrl(url);
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'CursusLinkChecker/1.0 (+https://cursus.dev/bot)',
      },
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export const checkBrokenLinksFunction = inngest.createFunction(
  {
    id: 'check-broken-links',
    name: 'Ressources — Vérification des liens cassés',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { cron: '0 2 * * *' }, // tous les jours à 2h UTC
  async ({ step }) => {
    // --- Étape 1 : Récupérer tous les modules avec des ressources ---
    const modules = await step.run('fetch-modules-with-resources', async () => {
      return prisma.module.findMany({
        select: { id: true, resourcesJson: true, cursus: { select: { ownerId: true } } },
        take: MAX_RESOURCES_PER_BATCH,
      });
    });

    const modulesWithResources = modules.filter((m) => {
      const resources = m.resourcesJson;
      return Array.isArray(resources) && resources.length > 0;
    });

    logger.info(
      { totalModules: modules.length, withResources: modulesWithResources.length },
      'check-broken-links.start',
    );

    let brokenCount = 0;
    let checkedCount = 0;

    // --- Étape 2 : Vérifier chaque ressource ---
    for (const module_ of modulesWithResources) {
      const resources = module_.resourcesJson as Resource[];

      await step.run(`check-module-${module_.id}`, async () => {
        const updatedResources = await Promise.all(
          resources.map(async (resource) => {
            if (typeof resource.url !== 'string') {
              return resource;
            }

            checkedCount++;
            const accessible = await isUrlAccessible(resource.url);
            const newStatus = accessible ? 'active' : 'broken';

            if (newStatus === 'broken' && resource.status !== 'broken') {
              brokenCount++;
              logger.warn(
                { moduleId: module_.id, resourceId: resource.id, url: resource.url },
                'resource.broken.detected',
              );
            }

            return { ...resource, status: newStatus };
          }),
        );

        await prisma.module.update({
          where: { id: module_.id },
          data: { resourcesJson: updatedResources },
        });
      });
    }

    logger.info(
      { checkedCount, brokenCount },
      'check-broken-links.completed',
    );

    return { success: true, checkedCount, brokenCount };
  },
);
