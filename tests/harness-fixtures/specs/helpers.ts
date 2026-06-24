/**
 * Helpers pour déclencher le harnais Cursus et attendre le résultat via polling.
 *
 * Prérequis (env vars) :
 *   CURSUS_GITHUB_APP_ID  — ID de la GitHub App harnais (non-vide = harnais configuré)
 *   CURSUS_API_BASE_URL   — URL de base de l'API Cursus (ex: http://localhost:3000)
 *   CURSUS_TEST_JWT       — JWT de test pour authentification API
 */

export interface HarnessRunResult {
  runId: string
  status: 'validated' | 'failed' | 'timeout'
  failedChecks: string[]
  durationMs: number
}

interface TriggerResponse {
  runId: string
}

interface RunStatusResponse {
  status: string
  checks: Array<{ name: string; passed: boolean }>
}

const CURSUS_API_BASE = process.env['CURSUS_API_BASE_URL'] ?? 'http://localhost:3000'
const CURSUS_TEST_JWT = process.env['CURSUS_TEST_JWT'] ?? ''
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000 // 10 min
const POLL_INTERVAL_MS = 10_000 // 10 s

/** Indique si le harnais est configuré (présence des env vars obligatoires). */
export function isHarnessConfigured(): boolean {
  return Boolean(process.env['CURSUS_GITHUB_APP_ID'] && process.env['CURSUS_API_BASE_URL'])
}

/**
 * Déclenche un run du harnais contre `repoUrl` puis poll jusqu'à complétion
 * ou expiration du timeout.
 *
 * Le run est déclenché en mode "test" (read-only, pas de side-effect sur les fixtures).
 */
export async function runHarnessAgainst(
  repoUrl: string,
  options: { timeoutMs?: number } = {},
): Promise<HarnessRunResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startTime = Date.now()

  const runId = await triggerRun(repoUrl)

  while (Date.now() - startTime < timeoutMs) {
    await sleep(POLL_INTERVAL_MS)

    const run = await fetchRunStatus(runId)
    if (run === null) { continue }

    const terminalStatuses = new Set(['completed', 'failed', 'validated'])
    if (terminalStatuses.has(run.status)) {
      return {
        runId,
        status: run.status === 'validated' ? 'validated' : 'failed',
        failedChecks: run.checks.filter((c) => !c.passed).map((c) => c.name),
        durationMs: Date.now() - startTime,
      }
    }
  }

  return { runId, status: 'timeout', failedChecks: [], durationMs: timeoutMs }
}

async function triggerRun(repoUrl: string): Promise<string> {
  const response = await fetch(`${CURSUS_API_BASE}/api/harness/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CURSUS_TEST_JWT}`,
    },
    body: JSON.stringify({ repoUrl, mode: 'test' }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`[harness] trigger failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as TriggerResponse
  return data.runId
}

async function fetchRunStatus(runId: string): Promise<RunStatusResponse | null> {
  const response = await fetch(`${CURSUS_API_BASE}/api/harness/runs/${runId}`, {
    headers: { Authorization: `Bearer ${CURSUS_TEST_JWT}` },
  })

  if (!response.ok) { return null }

  return (await response.json()) as RunStatusResponse
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
