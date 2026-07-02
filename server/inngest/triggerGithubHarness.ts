/**
 * Inngest function — déclenchement du workflow GitHub Actions "cursus-harness-runner".
 *
 * Flux :
 *  1. Récupère le HarnessRun en DB (idempotence : si déjà RUNNING/SUCCESS/FAILURE → skip)
 *  2. Génère un JWT GitHub App → échange contre un installation token
 *  3. Dispatche workflow_dispatch vers le repo cursus-harness-runner
 *  4. Met à jour HarnessRun.status = RUNNING + githubRunId + githubWorkflowUrl
 *
 * Sur échec exhaustif (DLQ) : marque le run TIMEOUT.
 *
 * Cf. ST-06.1 — TT-06.1.6.
 */
import * as Sentry from '@sentry/nuxt';
import { NonRetriableError } from 'inngest';
import { z } from 'zod';
import { inngest } from '~~/server/inngest/client';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

// ─── Schémas Zod pour les réponses GitHub API ─────────────────────────────────

const GitHubInstallationsSchema = z.array(
  z.object({ id: z.number(), account: z.object({ login: z.string() }) }),
);

const GitHubTokenSchema = z.object({ token: z.string() });

const GitHubWorkflowRunSchema = z.object({
  workflow_runs: z.array(
    z.object({ id: z.number(), html_url: z.string(), created_at: z.string() }),
  ),
});

const HarnessTriggerEventSchema = z.object({
  harnessRunId: z.string(),
  submissionId: z.string(),
  repoUrl: z.string(),
  deployUrl: z.string().optional(),
  criteriaJson: z.string(),
});

const GITHUB_API_BASE = 'https://api.github.com';
const HARNESS_ORG = process.env['GITHUB_HARNESS_ORG'] ?? 'cursus-dev';
const HARNESS_REPO = process.env['GITHUB_HARNESS_REPO'] ?? 'cursus-harness-runner';
const HARNESS_WORKFLOW = process.env['GITHUB_HARNESS_WORKFLOW'] ?? 'harness.yml';
const HARNESS_REF = process.env['GITHUB_HARNESS_REF'] ?? 'main';

/**
 * Encode un segment en base64url (sans padding).
 * Compatible Node.js 16+ et Edge runtimes.
 */
function base64url(data: string | ArrayBuffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return buf.toString('base64url');
}

/**
 * Génère un JWT signé RS256 pour s'authentifier comme GitHub App.
 * Utilise l'API WebCrypto disponible en Node 18+.
 */
async function generateGitHubAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iat: now - 60, // -60s pour clock skew
      exp: now + 600, // 10 min max selon GitHub
      iss: appId,
    }),
  );

  const signingInput = `${header}.${payload}`;

  // Importer la clé PEM RS256
  const pemBody = privateKeyPem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const derBuffer = Buffer.from(pemBody, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    derBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput, 'utf8'),
  );

  const signature = base64url(signatureBuffer);
  return `${signingInput}.${signature}`;
}

/**
 * Récupère l'installation token via l'API GitHub App.
 */
async function getInstallationToken(appJwt: string): Promise<string> {
  // 1. Lister les installations
  const installationsRes = await fetch(`${GITHUB_API_BASE}/app/installations`, {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!installationsRes.ok) {
    const body = await installationsRes.text();
    throw new Error(`GitHub App installations fetch failed (${installationsRes.status}): ${body}`);
  }

  const installations = GitHubInstallationsSchema.parse(await installationsRes.json());

  const installation = installations.find((i) => i.account.login === HARNESS_ORG);
  if (!installation) {
    throw new NonRetriableError(
      `GitHub App installation not found for org "${HARNESS_ORG}". Configure the App on the org.`,
    );
  }

  // 2. Créer un access token pour cette installation
  const tokenRes = await fetch(
    `${GITHUB_API_BASE}/app/installations/${installation.id}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`GitHub installation token creation failed (${tokenRes.status}): ${body}`);
  }

  const tokenData = GitHubTokenSchema.parse(await tokenRes.json());
  return tokenData.token;
}

/**
 * Dispatche le workflow GitHub Actions via workflow_dispatch.
 * Retourne l'ID du run créé (obtenu en listant les runs juste après le dispatch).
 */
async function dispatchWorkflow(
  installationToken: string,
  inputs: {
    submission_id: string;
    repo_url: string;
    deploy_url?: string;
    criteria_json: string;
  },
): Promise<{ runId: string; workflowUrl: string }> {
  const dispatchRes = await fetch(
    `${GITHUB_API_BASE}/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/workflows/${HARNESS_WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${installationToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: HARNESS_REF,
        inputs: {
          submission_id: inputs.submission_id,
          repo_url: inputs.repo_url,
          deploy_url: inputs.deploy_url ?? '',
          criteria_json: inputs.criteria_json,
        },
      }),
    },
  );

  // 204 No Content = succès pour workflow_dispatch
  if (dispatchRes.status !== 204) {
    const body = await dispatchRes.text();
    throw new Error(`GitHub workflow_dispatch failed (${dispatchRes.status}): ${body}`);
  }

  // Pause 2s pour laisser GitHub enregistrer le run avant de le lister
  await new Promise((resolve) => setTimeout(resolve, 2_000));

  // Récupérer l'ID du run le plus récent déclenché par workflow_dispatch
  const runsRes = await fetch(
    `${GITHUB_API_BASE}/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/runs?event=workflow_dispatch&per_page=5`,
    {
      headers: {
        Authorization: `token ${installationToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!runsRes.ok) {
    throw new Error(`GitHub runs list failed (${runsRes.status})`);
  }

  const runsData = GitHubWorkflowRunSchema.parse(await runsRes.json());

  const latestRun = runsData.workflow_runs[0];
  if (!latestRun) {
    throw new Error('GitHub workflow run not found after dispatch');
  }

  return {
    runId: String(latestRun.id),
    workflowUrl: latestRun.html_url,
  };
}

// ─── Inngest Function ─────────────────────────────────────────────────────────

export const triggerGithubHarness = inngest.createFunction(
  {
    id: 'trigger-github-harness',
    name: 'Harnais — Déclenchement workflow GitHub Actions',
    retries: 5,
    triggers: [{ event: 'harness/trigger' }],
    onFailure: async ({ event, error }) => {
      // DLQ : retries épuisées → marquer le run TIMEOUT
      const parsed = HarnessTriggerEventSchema.safeParse(event.data);
      if (!parsed.success) {
        logger.error({ error: error.message, raw: event.data }, 'harness.dlq.invalid_event_shape');
        return;
      }

      const { harnessRunId, submissionId } = parsed.data;
      if (!harnessRunId) {
        logger.error({ error: error.message }, 'harness.dlq.no_run_id');
        return;
      }

      try {
        await prisma.harnessRun.update({
          where: { id: harnessRunId },
          data: {
            status: 'TIMEOUT',
            finishedAt: new Date(),
            errorMessage: `DLQ — retries épuisées : ${error.message}`,
          },
        });
        logger.error({ harnessRunId, submissionId }, 'harness.dlq.marked_timeout');
        Sentry.captureException(new Error(`harness.dlq: ${error.message}`), {
          level: 'fatal',
          tags: { component: 'harness', event: 'dlq.exhausted' },
          extra: { harnessRunId, submissionId },
        });
      } catch (dbError) {
        logger.error({ harnessRunId, dbError }, 'harness.dlq.update_failed');
      }
    },
  },
  async ({ event, step }) => {
    const { harnessRunId, submissionId, repoUrl, deployUrl, criteriaJson } =
      HarnessTriggerEventSchema.parse(event.data);

    // ─── Étape 1 : Vérifier l'idempotence ──────────────────────────────────
    const currentRun = await step.run('check-run-state', async () => {
      return prisma.harnessRun.findUnique({
        where: { id: harnessRunId },
        select: { id: true, status: true, githubRunId: true },
      });
    });

    if (!currentRun) {
      throw new NonRetriableError(`HarnessRun ${harnessRunId} introuvable.`);
    }

    // Si déjà traité (autre que QUEUED), skip sans erreur
    if (currentRun.status !== 'QUEUED') {
      logger.info(
        { harnessRunId, status: currentRun.status },
        'harness.trigger.skipped_already_processed',
      );
      return { skipped: true, status: currentRun.status };
    }

    // ─── Étape 2 : Récupérer les credentials GitHub App ────────────────────
    const { appJwt } = await step.run('generate-app-jwt', async () => {
      const appId = process.env['GITHUB_APP_ID'];
      const privateKey = process.env['GITHUB_APP_PRIVATE_KEY'];

      if (!appId || !privateKey) {
        throw new NonRetriableError(
          'GITHUB_APP_ID ou GITHUB_APP_PRIVATE_KEY non configuré. Configurer les secrets.',
        );
      }

      const jwt = await generateGitHubAppJwt(appId, privateKey);
      return { appJwt: jwt };
    });

    // ─── Étape 3 : Obtenir un installation token ────────────────────────────
    const { installationToken } = await step.run('get-installation-token', async () => {
      const token = await getInstallationToken(appJwt);
      return { installationToken: token };
    });

    // ─── Étape 4 : Dispatcher le workflow ───────────────────────────────────
    const { runId, workflowUrl } = await step.run('dispatch-workflow', async () => {
      return dispatchWorkflow(installationToken, {
        submission_id: submissionId,
        repo_url: repoUrl,
        ...(deployUrl !== undefined ? { deploy_url: deployUrl } : {}),
        criteria_json: criteriaJson,
      });
    });

    // ─── Étape 5 : Mettre à jour le HarnessRun → RUNNING ───────────────────
    await step.run('update-run-running', async () => {
      // Idempotence par githubRunId : si un autre run a déjà ce runId, on skip
      const existing = await prisma.harnessRun.findUnique({
        where: { githubRunId: runId },
        select: { id: true },
      });

      if (existing && existing.id !== harnessRunId) {
        logger.warn(
          { harnessRunId, githubRunId: runId, existingRunId: existing.id },
          'harness.trigger.duplicate_github_run_id',
        );
        return;
      }

      await prisma.harnessRun.update({
        where: { id: harnessRunId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          githubRunId: runId,
          githubWorkflowUrl: workflowUrl,
        },
      });

      logger.info(
        { harnessRunId, submissionId, githubRunId: runId, workflowUrl },
        'harness.trigger.running',
      );
    });

    return { harnessRunId, githubRunId: runId, workflowUrl };
  },
);
