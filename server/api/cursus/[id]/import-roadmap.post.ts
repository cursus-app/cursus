/**
 * POST /api/cursus/:id/import-roadmap — import d'une structure roadmap.sh.
 *
 * Deux modes d'entrée :
 *  - roadmapId : identifiant du catalogue intégré (ex. "frontend")
 *  - concepts  : liste personnalisée au format { title, url? }[]
 *
 * Comportement :
 *  - 'replace' (défaut) : supprime les modules existants, puis crée les nouveaux
 *  - 'append' : ajoute à la suite (semaine = max_existante + index + 1)
 *
 * Attribution CC BY-SA 4.0 ajoutée automatiquement à la description du cursus.
 *
 * Cf. ST-03.7 — TT-03.7.2 (parsing), TT-03.7.4 (import), TT-03.7.5 (attribution)
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { importRoadmapSchema } from '~~/shared/schemas/cursus';
import { ROADMAP_CATALOG, ROADMAP_ATTRIBUTION } from '~~/server/data/roadmap-catalog';

export default defineEventHandler(async (event) => {
  const cursusId = getRouterParam(event, 'id');

  if (!cursusId) {
    throw createError({ statusCode: 400, message: 'Missing cursus id' });
  }

  // ─── Authentification ────────────────────────────────────────────────────────

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cursus:import-roadmap:${supabaseUser['id']}`, 20, 60 * 60 * 1_000);

  // ─── Vérification permissions ────────────────────────────────────────────────

  const [dbUser, cursus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.cursus.findUnique({
      where: { id: cursusId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        description: true,
        _count: { select: { modules: true } },
      },
    }),
  ]);

  if (!cursus) {
    throw createError({ statusCode: 404, message: 'cursus.errors.notFound' });
  }

  const isAdmin = dbUser?.globalRole === 'ADMIN';
  const isOwner = dbUser?.id === cursus.ownerId;

  if (!isAdmin && !isOwner) {
    logger.warn(
      { cursusId, userIdHash: hashId(supabaseUser['id']) },
      'cursus.import_roadmap.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cursus.errors.forbidden' });
  }

  if (cursus.status === 'ARCHIVED') {
    throw createError({ statusCode: 422, message: 'cursus.errors.cannotEditArchived' });
  }

  // ─── Validation du body ──────────────────────────────────────────────────────

  const body = await readValidatedBody(event, (raw) => importRoadmapSchema.parse(raw));

  // ─── Résolution des concepts ─────────────────────────────────────────────────

  // exactOptionalPropertyTypes : on utilise string | undefined pour autoriser
  // les propriétés absentes ET les valeurs undefined issues du parsing Zod.
  let concepts: Array<{ title: string; url: string | undefined }>;
  let sourceUrl: string | undefined;
  let roadmapTitle: string | undefined;

  if (body.roadmapId) {
    const entry = ROADMAP_CATALOG.find((r) => r.id === body.roadmapId);
    if (!entry) {
      throw createError({
        statusCode: 422,
        message: 'cursus.importRoadmap.errors.unknownRoadmapId',
      });
    }
    // Les concepts du catalogue ont des URL toujours définies.
    concepts = entry.concepts.map((c) => ({ title: c.title, url: c.url as string | undefined }));
    sourceUrl = entry.sourceUrl;
    roadmapTitle = entry.title;
  } else {
    // body.concepts est garanti non-undefined par le raffinement Zod
    // (au moins roadmapId ou concepts doit être fourni)
    const raw = body.concepts ?? [];
    concepts = raw.map((c) => ({ title: c.title, url: c.url }));
    sourceUrl = body.sourceUrl;
    roadmapTitle = body.title;
  }

  if (concepts.length === 0) {
    throw createError({
      statusCode: 422,
      message: 'cursus.importRoadmap.errors.noConceptsFound',
    });
  }

  // ─── Calcul du premier numéro de semaine ──────────────────────────────────────

  let startWeek = 1;

  if (body.mode === 'append') {
    const maxWeekResult = await prisma.module.aggregate({
      where: { cursusId },
      _max: { week: true },
    });
    startWeek = (maxWeekResult._max.week ?? 0) + 1;
  }

  // ─── Transaction : suppression + création ────────────────────────────────────

  const result = await prisma.$transaction(async (tx) => {
    // En mode 'replace', supprimer les modules existants.
    let deletedCount = 0;
    if (body.mode === 'replace') {
      const deleted = await tx.module.deleteMany({ where: { cursusId } });
      deletedCount = deleted.count;
    }

    // Créer les modules depuis les concepts, dans l'ordre.
    const modulesData = concepts.map((concept, index) => ({
      cursusId,
      week: startWeek + index,
      title: concept.title,
      objectives: `Maîtriser le concept "${concept.title}".${sourceUrl ? ` Voir : ${sourceUrl}` : ''}`,
      resourcesJson: concept.url ? { roadmapUrl: concept.url, sourceUrl } : { sourceUrl },
      deliverableSpecJson: {},
      xpReward: 100,
    }));

    await tx.module.createMany({ data: modulesData });

    // Ajouter l'attribution CC BY-SA 4.0 dans la description si absente.
    const currentDescription = cursus.description ?? '';
    const hasAttribution = currentDescription.includes('roadmap.sh');
    if (!hasAttribution) {
      const separator = currentDescription.length > 0 ? '\n\n' : '';
      await tx.cursus.update({
        where: { id: cursusId },
        data: {
          description: `${currentDescription}${separator}${ROADMAP_ATTRIBUTION}`,
        },
      });
    }

    return { created: modulesData.length, deleted: deletedCount };
  });

  logger.info(
    {
      cursusId,
      roadmapId: body.roadmapId,
      roadmapTitle,
      created: result.created,
      deleted: result.deleted,
      mode: body.mode,
      userIdHash: hashId(supabaseUser['id']),
    },
    'cursus.import.roadmap_sh',
  );

  return {
    created: result.created,
    deleted: result.deleted,
    roadmapTitle: roadmapTitle ?? 'Custom roadmap',
    sourceUrl,
    attribution: ROADMAP_ATTRIBUTION,
  };
});
