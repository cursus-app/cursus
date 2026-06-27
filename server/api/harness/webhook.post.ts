/**
 * POST /api/harness/webhook
 *
 * Reçoit le callback du workflow GitHub Actions une fois le run terminé.
 *
 * Sécurité :
 *  - HMAC SHA-256 sur le corps brut, vérification en temps constant.
 *  - Secret : GITHUB_APP_WEBHOOK_SECRET.
 *
 * Idempotence : par HarnessRun.githubRunId (contrainte @unique en DB).
 *
 * Cf. ST-06.1 — TT-06.1.4.
 */
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { logger } from '~~/server/utils/logger';
import { prisma } from '~~/server/utils/prisma';
import type { ChecksJson } from '~~/shared/types/harness';

// ─── Schéma de validation du payload ─────────────────────────────────────────

const CheckResultSchema = z.object({
  check_id: z.string().min(1),
  status: z.enum(['success', 'failure', 'error', 'skipped']),
  message: z.string(),
  details: z.unknown().optional(),
});

const WebhookPayloadSchema = z.object({
  run_id: z.string().min(1),
  workflow_url: z.string().url(),
  submission_id: z.string().uuid(),
  status: z.enum(['success', 'failure', 'timeout', 'cancelled']),
  checks: z.array(CheckResultSchema),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime(),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ─── Mapping statut webhook → statut DB ──────────────────────────────────────

const HARNESS_STATUS_MAP = {
  success: 'SUCCESS',
  failure: 'FAILURE',
  timeout: 'TIMEOUT',
  cancelled: 'CANCELLED',
} as const satisfies Record<WebhookPayload['status'], string>;

const SUBMISSION_STATUS_MAP = {
  success: 'VALIDATED',
  failure: 'FAILED',
  timeout: 'TIMEOUT',
  cancelled: 'PENDING',
} as const satisfies Record<WebhookPayload['status'], string>;

// ─── Vérification HMAC ───────────────────────────────────────────────────────

/**
 * Calcule le HMAC SHA-256 d'un corps brut avec une clé secrète.
 * Retourne la signature hex prefixée "sha256=".
 */
async function computeHmacSignature(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hexSignature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hexSignature}`;
}

/**
 * Compare deux chaînes en temps constant pour éviter les timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const webhookSecret = process.env['GITHUB_APP_WEBHOOK_SECRET'];

  // ── 1. Lire le corps brut AVANT toute transformation ──────────────────────
  const rawBody = await readRawBody(event, false);

  if (!rawBody) {
    logger.warn({}, 'harness.webhook.empty_body');
    throw createError({ statusCode: 400, message: 'Corps de requête vide.' });
  }

  const bodyString = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);

  // ── 2. Vérification HMAC (si secret configuré) ────────────────────────────
  if (webhookSecret) {
    const receivedSig =
      getHeader(event, 'x-harness-signature') ?? getHeader(event, 'x-hub-signature-256');

    if (!receivedSig) {
      logger.warn({}, 'harness.webhook.missing_signature');
      throw createError({ statusCode: 401, message: 'Signature HMAC manquante.' });
    }

    const expectedSig = await computeHmacSignature(webhookSecret, bodyString);

    if (!timingSafeEqual(receivedSig, expectedSig)) {
      logger.warn({ receivedSig: '[REDACTED]' }, 'harness.webhook.invalid_signature');
      throw createError({ statusCode: 401, message: 'Signature HMAC invalide.' });
    }
  }

  // ── 3. Parser et valider le payload ───────────────────────────────────────
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(bodyString);
  } catch {
    logger.warn({}, 'harness.webhook.invalid_json');
    throw createError({ statusCode: 400, message: 'JSON invalide.' });
  }

  const parseResult = WebhookPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    logger.warn({ errors: parseResult.error.flatten() }, 'harness.webhook.validation_error');
    throw createError({
      statusCode: 400,
      message: 'Payload invalide.',
      data: parseResult.error.flatten(),
    });
  }

  const payload = parseResult.data;

  logger.info(
    { githubRunId: payload.run_id, submissionId: payload.submission_id, status: payload.status },
    'harness.webhook.received',
  );

  // ── 4. Trouver le HarnessRun par githubRunId ──────────────────────────────
  const harnessRun = await prisma.harnessRun.findUnique({
    where: { githubRunId: payload.run_id },
    select: { id: true, status: true, submissionId: true },
  });

  if (!harnessRun) {
    // Pas encore de run avec cet ID — peut arriver si le dispatch est en retard
    // Tenter via submissionId + statut RUNNING
    const runBySubmission = await prisma.harnessRun.findFirst({
      where: {
        submissionId: payload.submission_id,
        status: 'RUNNING',
        githubRunId: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, submissionId: true },
    });

    if (!runBySubmission) {
      logger.warn(
        { githubRunId: payload.run_id, submissionId: payload.submission_id },
        'harness.webhook.run_not_found',
      );
      // 200 pour éviter que GitHub réessaie indéfiniment un webhook non actionnable
      return { ok: true, message: 'Run inconnu — ignoré.' };
    }

    await processWebhook(runBySubmission.id, payload);
  } else {
    // Idempotence : si déjà traité, skip
    if (harnessRun.status !== 'RUNNING' && harnessRun.status !== 'QUEUED') {
      logger.info(
        { harnessRunId: harnessRun.id, status: harnessRun.status },
        'harness.webhook.already_processed',
      );
      return { ok: true, message: 'Déjà traité — ignoré.' };
    }

    await processWebhook(harnessRun.id, payload);
  }

  return { ok: true };
});

// ─── Traitement interne ───────────────────────────────────────────────────────

async function processWebhook(harnessRunId: string, payload: WebhookPayload): Promise<void> {
  const harnessStatus = HARNESS_STATUS_MAP[payload.status];
  const submissionStatus = SUBMISSION_STATUS_MAP[payload.status];

  const checksJson: ChecksJson = { checks: payload.checks };

  await prisma.$transaction(async (tx) => {
    // Mettre à jour le HarnessRun
    const updatedRun = await tx.harnessRun.update({
      where: { id: harnessRunId },
      data: {
        status: harnessStatus,
        githubRunId: payload.run_id,
        githubWorkflowUrl: payload.workflow_url,
        startedAt: new Date(payload.started_at),
        finishedAt: new Date(payload.finished_at),
        checksJson: checksJson as unknown as Prisma.JsonObject,
      },
      select: { id: true, submissionId: true },
    });

    // Mettre à jour la Submission
    await tx.submission.update({
      where: { id: updatedRun.submissionId },
      data: {
        status: submissionStatus,
        ...(payload.status === 'success' ? { validatedAt: new Date(payload.finished_at) } : {}),
      },
    });

    // Mettre à jour la Progression (SOUMIS → VALIDE ou BLOQUE selon résultat)
    if (payload.status === 'success' || payload.status === 'failure') {
      const submission = await tx.submission.findUnique({
        where: { id: updatedRun.submissionId },
        select: { userId: true, moduleId: true },
      });

      if (submission) {
        const cohortModule = await tx.cohortModule.findFirst({
          where: { moduleId: submission.moduleId },
          select: { id: true },
        });

        if (cohortModule) {
          const progressionStatus = payload.status === 'success' ? 'VALIDE' : 'BLOQUE';
          await tx.progression.updateMany({
            where: {
              userId: submission.userId,
              cohortModuleId: cohortModule.id,
              status: 'SOUMIS',
            },
            data: {
              status: progressionStatus,
              ...(payload.status === 'success'
                ? { validatedAt: new Date(payload.finished_at) }
                : {}),
            },
          });
        }
      }
    }
  });

  logger.info(
    {
      harnessRunId,
      githubRunId: payload.run_id,
      submissionId: payload.submission_id,
      status: harnessStatus,
    },
    'harness.webhook.processed',
  );
}
