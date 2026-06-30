/**
 * Cursus Harness PoC — Bench script (ST-01.6)
 *
 * Exécute N runs successifs et calcule p50/p95 de latence.
 * Écrit les résultats dans logs/bench-<timestamp>.csv
 *
 * Usage :
 *   GITHUB_TOKEN=ghp_xxx \
 *   TARGET_REPO=cursus-fixtures/pass-all-checks \
 *   N=10 \
 *   node bench.js
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const N = parseInt(process.env['N'] ?? '10', 10);
const TARGET_REPO = process.env['TARGET_REPO'] ?? 'cursus-fixtures/pass-all-checks';
const SLEEP_BETWEEN_RUNS_MS = parseInt(process.env['SLEEP_MS'] ?? '5000', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Calcule un percentile sur tableau trié */
function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runOnce(i) {
  console.log(`\n──── Run ${i + 1}/${N} ────`);
  const start = Date.now();

  const result = spawnSync('node', [path.join(__dirname, 'trigger.js')], {
    env: { ...process.env, TARGET_REPO },
    stdio: 'inherit',
    timeout: 7 * 60 * 1000,
  });

  if (result.status === 0) {
    return { run: i + 1, durationMs: Date.now() - start, status: 'ok' };
  }
  const errMsg = result.error?.message ?? `exit code ${result.status}`;
  return { run: i + 1, durationMs: Date.now() - start, status: 'error', error: errMsg };
}

async function main() {
  console.log(`\n🏁 Benchmark Cursus Harness PoC`);
  console.log(`   Target repo : ${TARGET_REPO}`);
  console.log(`   N runs      : ${N}`);
  console.log(`   Pause entre runs : ${SLEEP_BETWEEN_RUNS_MS}ms\n`);

  const results = [];

  for (let i = 0; i < N; i++) {
    const result = await runOnce(i);
    results.push(result);

    if (i < N - 1) {
      console.log(`\nPause ${SLEEP_BETWEEN_RUNS_MS / 1000}s avant prochain run...`);
      await sleep(SLEEP_BETWEEN_RUNS_MS);
    }
  }

  // ─── Calcul statistiques ─────────────────────────────────────────────────

  const successful = results.filter((r) => r.status === 'ok');
  const durations = successful.map((r) => r.durationMs).sort((a, b) => a - b);

  const p50 = durations.length ? percentile(durations, 50) : null;
  const p95 = durations.length ? percentile(durations, 95) : null;
  const avg = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;
  const min = durations[0] ?? null;
  const max = durations[durations.length - 1] ?? null;

  // ─── Export CSV ──────────────────────────────────────────────────────────

  const logDir = path.join(__dirname, 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csvFile = path.join(logDir, `bench-${ts}.csv`);

  const csvLines = [
    'run,durationMs,durationS,status,error',
    ...results.map(
      (r) =>
        `${r.run},${r.durationMs},${(r.durationMs / 1000).toFixed(1)},${r.status},"${r.error ?? ''}"`,
    ),
  ];
  fs.writeFileSync(csvFile, csvLines.join('\n') + '\n');

  // ─── Affichage résumé ────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════════');
  console.log('  RÉSULTATS BENCHMARK CURSUS HARNESS PoC');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Runs OK    : ${successful.length}/${N}`);
  if (durations.length) {
    console.log(`  Min        : ${Math.round(min / 1000)}s`);
    console.log(`  Max        : ${Math.round(max / 1000)}s`);
    console.log(`  Moyenne    : ${Math.round(avg / 1000)}s`);
    console.log(`  p50        : ${Math.round(p50 / 1000)}s`);
    console.log(`  p95        : ${Math.round(p95 / 1000)}s`);
    console.log('');
    const slaOk = p95 <= 3 * 60 * 1000;
    console.log(`  SLA p95<3min : ${slaOk ? '✅ OK' : '❌ KO'}`);
    console.log(`  Go/No-Go     : ${slaOk ? '🟢 GO' : '🔴 NO-GO'}`);
  }
  console.log('══════════════════════════════════════════════════');
  console.log(`\n  CSV exporté : ${csvFile}\n`);

  // Écrire un summary.json pour la note de spike
  const summaryFile = path.join(logDir, `bench-${ts}-summary.json`);
  fs.writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        targetRepo: TARGET_REPO,
        n: N,
        successCount: successful.length,
        p50Ms: p50,
        p95Ms: p95,
        avgMs: avg,
        minMs: min,
        maxMs: max,
        slaOk: p95 != null ? p95 <= 3 * 60 * 1000 : null,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('💥', err.message);
  process.exit(99);
});
