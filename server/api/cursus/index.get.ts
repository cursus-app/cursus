/**
 * GET /api/cursus — liste paginée des cursus avec filtres.
 *
 * Règles de visibilité :
 *  - Non authentifié ou stagiaire → uniquement PUBLISHED.
 *  - Formateur / admin → ses propres cursus (tous statuts) + tous les PUBLISHED.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { listCursusQuerySchema } from '~~/shared/schemas/cursus';

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, (raw) => listCursusQuerySchema.parse(raw));

  // Auth facultative — les cursus publiés sont accessibles publiquement.
  const supabaseUser = await serverSupabaseUser(event);

  let canSeeOwn = false;
  let ownerId: string | null = null;

  if (supabaseUser) {
    const dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    });

    if (dbUser) {
      const managerRoles = ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR', 'ADMIN'] as const;
      canSeeOwn = managerRoles.some((r) => r === dbUser.globalRole);
      if (canSeeOwn) {
        ownerId = dbUser.id;
      }
    }
  }

  const { page, limit, status, domain, level } = query;
  const skip = (page - 1) * limit;

  // Construction des conditions AND.
  // Pour un formateur : visibilité = (published OU propriétaire) ET filtres.
  // Pour les autres : visibilité = published ET filtres.
  type CursusWhere = NonNullable<Parameters<typeof prisma.cursus.findMany>[0]>['where'];
  const conditions: NonNullable<CursusWhere>[] = [];

  // Condition de visibilité
  if (canSeeOwn && ownerId) {
    conditions.push({ OR: [{ status: 'PUBLISHED' }, { ownerId }] });
  } else {
    conditions.push({ status: 'PUBLISHED' });
  }

  // Filtres optionnels
  if (status) {
    conditions.push({ status });
  }
  if (domain) {
    conditions.push({ domain });
  }
  if (level) {
    conditions.push({ level });
  }

  const where: NonNullable<CursusWhere> = conditions.length === 1
    ? (conditions[0] ?? {})
    : { AND: conditions };

  const [total, data] = await Promise.all([
    prisma.cursus.count({ where }),
    prisma.cursus.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        domain: true,
        level: true,
        durationWeeks: true,
        status: true,
        ownerId: true,
        createdAt: true,
        _count: { select: { modules: true } },
      },
    }),
  ]);

  logger.info({ page, limit, total }, 'cursus.list');

  return { data, total, page, limit };
});
