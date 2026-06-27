/**
 * GET /api/cohortes/:id/shift-schedule?days=N — aperçu du décalage de planning.
 *
 * Retourne les nouvelles dates sans les appliquer.
 * Autorisé pour : formateur principal de la cohorte ou ADMIN global.
 *
 * Cf. ST-04.4 — Échéancier et décalage de planning.
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import { shiftScheduleQuerySchema } from '~~/shared/schemas/cohorte';

/** Ajoute N jours à une Date et retourne une nouvelle Date. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing cohorte id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`cohortes:shift-preview:${supabaseUser['id']}`, 60, 60 * 1_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  const isAdmin = dbUser.globalRole === 'ADMIN';

  const query = await getValidatedQuery(event, (raw) => shiftScheduleQuerySchema.parse(raw));

  const cohorte = await prisma.cohorte.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { role: 'FORMATEUR_PRINCIPAL' },
        select: { userId: true },
      },
      cohortModules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          dueDate: true,
          position: true,
          moduleId: true,
          module: { select: { week: true, title: true } },
        },
      },
    },
  });

  if (!cohorte) {
    throw createError({ statusCode: 404, message: 'cohortes.errors.notFound' });
  }

  const isFormateurPrincipal = cohorte.memberships.some((m) => m.userId === dbUser.id);

  if (!isAdmin && !isFormateurPrincipal) {
    logger.warn(
      { cohorteId: id, userIdHash: hashId(supabaseUser['id']) },
      'cohorte.shift-preview.forbidden',
    );
    throw createError({ statusCode: 403, message: 'cohortes.errors.forbidden' });
  }

  const { days } = query;

  const items = cohorte.cohortModules.map((cm) => ({
    cohortModuleId: cm.id,
    moduleId: cm.moduleId,
    week: cm.module.week,
    title: cm.module.title,
    currentDueDate: cm.dueDate,
    newDueDate: addDays(cm.dueDate, days),
  }));

  return {
    preview: true,
    days,
    items,
  };
});
