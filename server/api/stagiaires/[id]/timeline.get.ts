/**
 * GET /api/stagiaires/:id/timeline — timeline cursor-paginée d'un stagiaire.
 *
 * Agrège les événements de 4 sources (submissions, harness_runs, alerts, audit_logs)
 * et les retourne triés par timestamp décroissant, 50 par page.
 *
 * Auth  : FORMATEUR_PRINCIPAL ou CO_FORMATEUR de la cohorteId passée en query.
 * Query : cohorteId (required), cursor (ISO timestamp — exclusif), type (CSV)
 *
 * Pagination : cursor-based sur timestamp. Les événements ayant exactement le même
 * timestamp que le cursor peuvent être omis (rare en pratique).
 *
 * Cf. ST-13.3 — TT-13.3.5
 */
import { z } from 'zod';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';
import { checkRateLimit } from '~~/server/utils/inMemoryRateLimit';
import type { TimelineEvent, TimelineEventType, TimelineResponse } from '~~/shared/types/timeline';

const PAGE_SIZE = 50;
const SUBMISSION_ID_LIMIT = 500;

const QuerySchema = z.object({
  cohorteId: z.string().uuid({ message: 'cohorteId doit être un UUID valide' }),
  cursor: z.string().datetime({ offset: true }).optional(),
  type: z.string().optional(),
});

const VALID_TYPES: ReadonlySet<TimelineEventType> = new Set([
  'submission',
  'harness_run',
  'alert',
  'audit',
]);

function isValidType(t: string): t is TimelineEventType {
  return VALID_TYPES.has(t as TimelineEventType);
}

export default defineEventHandler(async (event): Promise<TimelineResponse> => {
  const stagiaireId = getRouterParam(event, 'id');
  if (!stagiaireId) {
    throw createError({ statusCode: 400, message: 'Missing stagiaire id' });
  }

  const rawQuery = getQuery(event);
  const parsedQuery = QuerySchema.safeParse(rawQuery);
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres invalides',
      data: parsedQuery.error.flatten(),
    });
  }

  const { cohorteId, cursor: cursorStr, type: typeParam } = parsedQuery.data;
  const cursor = cursorStr ? new Date(cursorStr) : null;

  // Filtre de type : comma-separated list, ou null = tous
  const typeFilter: ReadonlySet<TimelineEventType> | null = typeParam
    ? new Set(typeParam.split(',').filter(isValidType))
    : null;

  const includeType = (t: TimelineEventType): boolean => typeFilter === null || typeFilter.has(t);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabaseUser = await serverSupabaseUser(event);
  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  checkRateLimit(`stagiaires:timeline:${supabaseUser['id']}`, 120, 60_000);

  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser['id'] },
    select: { id: true, globalRole: true },
  });
  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // ── Vérifier que le caller est formateur de la cohorte ────────────────────
  const isAdmin = dbUser.globalRole === 'ADMIN';
  if (!isAdmin) {
    const callerMembership = await prisma.membership.findFirst({
      where: {
        userId: dbUser.id,
        cohorteId,
        role: { in: ['FORMATEUR_PRINCIPAL', 'CO_FORMATEUR'] },
      },
      select: { id: true },
    });
    if (!callerMembership) {
      logger.warn(
        { formateurIdHash: hashId(dbUser.id), cohorteId },
        'stagiaire.timeline.forbidden',
      );
      throw createError({ statusCode: 403, message: 'Forbidden' });
    }
  }

  // ── Vérifier que le stagiaire est dans la cohorte ─────────────────────────
  const stagiaireMembership = await prisma.membership.findFirst({
    where: { userId: stagiaireId, cohorteId, role: 'STAGIAIRE' },
    select: { id: true },
  });
  if (!stagiaireMembership) {
    throw createError({ statusCode: 403, message: 'Stagiaire not in this cohorte' });
  }

  // ── Pré-charger les IDs de soumissions (nécessaires pour harness_run et audit) ──
  // Limité aux SUBMISSION_ID_LIMIT plus récentes pour éviter un array mémoire trop grand.
  const submissionRows = await prisma.submission.findMany({
    where: { userId: stagiaireId },
    select: { id: true },
    orderBy: { submittedAt: 'desc' },
    take: SUBMISSION_ID_LIMIT,
  });
  const allSubmissionIds = submissionRows.map((s) => s.id);

  // ── Fetch parallèle des événements filtrés ─────────────────────────────────
  const [rawSubmissions, rawHarnessRuns, rawAlerts, rawAuditLogs] = await Promise.all([
    // Submissions
    includeType('submission')
      ? prisma.submission.findMany({
          where: {
            userId: stagiaireId,
            ...(cursor !== null ? { submittedAt: { lt: cursor } } : {}),
          },
          include: {
            module: { select: { title: true } },
          },
          orderBy: { submittedAt: 'desc' },
          take: PAGE_SIZE + 1,
        })
      : Promise.resolve([]),

    // HarnessRuns
    includeType('harness_run') && allSubmissionIds.length > 0
      ? prisma.harnessRun.findMany({
          where: {
            submissionId: { in: allSubmissionIds },
            ...(cursor !== null ? { createdAt: { lt: cursor } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE + 1,
        })
      : Promise.resolve([]),

    // Alerts
    includeType('alert')
      ? prisma.alert.findMany({
          where: {
            userId: stagiaireId,
            ...(cursor !== null ? { createdAt: { lt: cursor } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE + 1,
        })
      : Promise.resolve([]),

    // AuditLogs liés aux soumissions du stagiaire
    includeType('audit') && allSubmissionIds.length > 0
      ? prisma.auditLog.findMany({
          where: {
            entityType: 'Submission',
            entityId: { in: allSubmissionIds },
            ...(cursor !== null ? { createdAt: { lt: cursor } } : {}),
          },
          include: {
            actor: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE + 1,
        })
      : Promise.resolve([]),
  ]);

  // ── Mapper vers TimelineEvent ─────────────────────────────────────────────

  const submissionEvents: TimelineEvent[] = rawSubmissions.map((s) => ({
    id: s.id,
    type: 'submission',
    timestamp: s.submittedAt.toISOString(),
    data: {
      moduleId: s.moduleId,
      moduleName: s.module.title,
      status: s.status,
      repoUrl: s.repoUrl,
      overriddenById: s.overriddenById,
      overrideReason: s.overrideReason,
    },
  }));

  const harnessEvents: TimelineEvent[] = rawHarnessRuns.map((r) => ({
    id: r.id,
    type: 'harness_run',
    timestamp: r.createdAt.toISOString(),
    data: {
      submissionId: r.submissionId,
      status: r.status,
      githubWorkflowUrl: r.githubWorkflowUrl,
      errorMessage: r.errorMessage,
    },
  }));

  const alertEvents: TimelineEvent[] = rawAlerts.map((a) => ({
    id: a.id,
    type: 'alert',
    timestamp: a.createdAt.toISOString(),
    data: {
      kind: a.kind,
      severity: a.severity,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    },
  }));

  const auditEvents: TimelineEvent[] = rawAuditLogs.map((l) => ({
    id: l.id,
    type: 'audit',
    timestamp: l.createdAt.toISOString(),
    data: {
      actorId: l.actorId,
      actorName: l.actor?.fullName ?? null,
      action: l.action,
      entityType: l.entityType,
      diff: l.diff,
    },
  }));

  // ── Merger, trier, paginer ────────────────────────────────────────────────
  const all = [...submissionEvents, ...harnessEvents, ...alertEvents, ...auditEvents];
  // Tri décroissant par timestamp (ISO string, comparaison lexicale correcte)
  all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));

  const hasMore = all.length > PAGE_SIZE;
  const page = all.slice(0, PAGE_SIZE);
  // Le nextCursor est le timestamp du dernier événement retourné
  const nextCursor = hasMore && page.length > 0 ? (page[page.length - 1]?.timestamp ?? null) : null;

  logger.info(
    {
      formateurId: hashId(dbUser.id),
      stagiaireIdHash: hashId(stagiaireId),
      cohorteId,
      count: page.length,
    },
    'stagiaire.fiche.viewed',
  );

  return { events: page, nextCursor };
});
