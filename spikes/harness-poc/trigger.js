/**
 * Cursus Harness PoC — Trigger script (ST-01.6)
 *
 * Déclenche un workflow GitHub Actions via workflow_dispatch,
 * attend le résultat par polling, et mesure la latence totale.
 *
 * Usage :
 *   GITHUB_TOKEN=ghp_xxx \
 *   TARGET_REPO=cursus-fixtures/pass-all-checks \
 *   CHECKS='{"repo_exists":true,"branch_exists":"main","file_exists":"README.md"}' \
 *   node trigger.js
 *
 * Authentification :
 *   - Pour le spike : Personal Access Token (GITHUB_TOKEN)
 *   - En production : GitHub App JWT → installation token (cf. triggerGithubHarness.ts)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
const TARGET_REPO = process.env['TARGET_REPO'] ?? 'cursus-fixtures/pass-all-checks';
const CHECKS = process.env['CHECKS']
  ? JSON.parse(process.env['CHECKS'])
  : { repo_exists: true, branch_exists: 'main', file_exists: 'README.md' };

const HARNESS_ORG = process.env['HARNESS_ORG'] ?? 'cursus-dev';
const HARNESS_REPO = process.env['HARNESS_REPO'] ?? 'cursus-harness-runner';
const HARNESS_WORKFLOW = process.env['HARNESS_WORKFLOW'] ?? 'harness.yml';
const HARNESS_REF = process.env['HARNESS_REF'] ?? 'main';

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 min

const GITHUB_API = 'https://api.github.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pause utilitaire */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wrapper fetch GitHub avec headers communs */
async function ghFetch(path, options = {}) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN manquant. Export GITHUB_TOKEN=ghp_xxx');

  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers ?? {}),
    },
  });

  return res;
}

// ─── Étape 1 : Vérifier que le repo cible est accessible ─────────────────────

async function checkRepoAccessible(repoFullName) {
  const res = await ghFetch(`/repos/${repoFullName}`);
  if (res.status === 404) return { ok: false, reason: 'repo_not_found' };
  if (res.status === 403) return { ok: false, reason: 'repo_private_or_forbidden' };
  if (!res.ok) return { ok: false, reason: `github_error_${res.status}` };
  return { ok: true };
}

// ─── Étape 2 : Dispatcher le workflow ────────────────────────────────────────

async function dispatchWorkflow(targetRepo, checks) {
  const res = await ghFetch(
    `/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/workflows/${HARNESS_WORKFLOW}/dispatches`,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: HARNESS_REF,
        inputs: {
          submission_id: `poc-${Date.now()}`,
          repo_url: `https://github.com/${targetRepo}`,
          criteria_json: JSON.stringify(checks),
        },
      }),
    },
  );

  // 204 No Content = succès pour workflow_dispatch
  if (res.status !== 204) {
    const body = await res.text();
    throw new Error(`workflow_dispatch échoué (${res.status}): ${body}`);
  }

  // Laisser 3s à GitHub pour enregistrer le run
  await sleep(3_000);
}

// ─── Étape 3 : Récupérer le run ID ───────────────────────────────────────────

async function getLatestRunId() {
  const res = await ghFetch(
    `/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/runs?event=workflow_dispatch&per_page=5`,
  );
  if (!res.ok) throw new Error(`Impossible de lister les runs (${res.status})`);

  const data = await res.json();
  const latest = data.workflow_runs?.[0];
  if (!latest) throw new Error('Aucun run GitHub Actions trouvé après dispatch');

  return { runId: String(latest.id), workflowUrl: latest.html_url };
}

// ─── Étape 4 : Polling jusqu'à completion ────────────────────────────────────

async function pollUntilComplete(runId, startMs) {
  while (true) {
    const elapsed = Date.now() - startMs;

    if (elapsed > TIMEOUT_MS) {
      return { status: 'timeout', conclusion: null, durationMs: elapsed };
    }

    const res = await ghFetch(`/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/runs/${runId}`);
    if (!res.ok) throw new Error(`Poll run échoué (${res.status})`);

    const run = await res.json();

    if (run.status === 'completed') {
      return {
        status: 'completed',
        conclusion: run.conclusion, // 'success' | 'failure' | 'cancelled' | ...
        durationMs: Date.now() - startMs,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

// ─── Étape 5 : Récupérer les outputs du workflow ─────────────────────────────

async function getWorkflowOutputs(runId) {
  const res = await ghFetch(`/repos/${HARNESS_ORG}/${HARNESS_REPO}/actions/runs/${runId}/jobs`);
  if (!res.ok) return null;

  const data = await res.json();
  // Le job principal s'appelle "harness"
  const harnessJob = data.jobs?.find((j) => j.name === 'harness') ?? data.jobs?.[0];
  if (!harnessJob) return null;

  // Extraire les steps (chaque check = 1 step)
  return harnessJob.steps?.map((s) => ({
    name: s.name,
    status: s.conclusion ?? s.status,
  }));
}

// ─── Logger ──────────────────────────────────────────────────────────────────

function logResult(entry) {
  const logDir = path.join(__dirname, 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, 'runs.jsonl');
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const runStart = Date.now();

  console.log(`\n🚀 Cursus Harness PoC`);
  console.log(`   Repo cible   : ${TARGET_REPO}`);
  console.log(`   Harness repo : ${HARNESS_ORG}/${HARNESS_REPO}`);
  console.log(`   Checks       : ${JSON.stringify(CHECKS)}`);
  console.log('');

  // 1. Vérifier accessibilité
  console.log('[ 1/5 ] Vérification accessibilité repo cible...');
  const access = await checkRepoAccessible(TARGET_REPO);
  if (!access.ok) {
    const entry = {
      ts: new Date().toISOString(),
      target: TARGET_REPO,
      status: 'failed',
      reason: access.reason,
      durationMs: Date.now() - runStart,
    };
    logResult(entry);
    console.error(`❌ Repo inaccessible : ${access.reason}`);
    process.exit(1);
  }
  console.log('   ✅ Repo accessible');

  // 2. Dispatch
  console.log('[ 2/5 ] Dispatch workflow_dispatch...');
  const dispatchStart = Date.now();
  await dispatchWorkflow(TARGET_REPO, CHECKS);
  console.log(`   ✅ Dispatché (${Date.now() - dispatchStart}ms)`);

  // 3. Récupérer Run ID
  console.log('[ 3/5 ] Récupération du Run ID...');
  const { runId, workflowUrl } = await getLatestRunId();
  console.log(`   ✅ Run ID : ${runId}`);
  console.log(`   🔗 ${workflowUrl}`);

  // 4. Poll
  console.log(
    `[ 4/5 ] Polling (interval ${POLL_INTERVAL_MS / 1000}s, timeout ${TIMEOUT_MS / 1000}s)...`,
  );
  const pollResult = await pollUntilComplete(runId, dispatchStart);

  if (pollResult.status === 'timeout') {
    const entry = {
      ts: new Date().toISOString(),
      target: TARGET_REPO,
      runId,
      workflowUrl,
      status: 'timeout',
      durationMs: pollResult.durationMs,
    };
    logResult(entry);
    console.error(`⏰ Timeout après ${Math.round(pollResult.durationMs / 1000)}s`);
    process.exit(2);
  }

  const { conclusion, durationMs } = pollResult;
  console.log(`   ✅ Workflow terminé : ${conclusion} (${Math.round(durationMs / 1000)}s)`);

  // 5. Outputs
  console.log('[ 5/5 ] Récupération des outputs de checks...');
  const steps = await getWorkflowOutputs(runId);

  const entry = {
    ts: new Date().toISOString(),
    target: TARGET_REPO,
    runId,
    workflowUrl,
    status: conclusion === 'success' ? 'validated' : 'failed',
    conclusion,
    durationMs,
    checks: CHECKS,
    steps,
  };

  logResult(entry);

  console.log('\n─────────────────────────────────────────────────');
  console.log(`Résultat    : ${entry.status === 'validated' ? '✅ VALIDATED' : '❌ FAILED'}`);
  console.log(`Durée totale: ${Math.round(durationMs / 1000)}s`);
  if (steps) {
    console.log('\nDétail des checks :');
    steps.forEach((s) => {
      const icon = s.status === 'success' ? '✅' : s.status === 'skipped' ? '⏭️' : '❌';
      console.log(`  ${icon} ${s.name} — ${s.status}`);
    });
  }
  console.log('─────────────────────────────────────────────────\n');
}

run().catch((err) => {
  console.error('💥 Erreur fatale :', err.message);
  process.exit(99);
});
