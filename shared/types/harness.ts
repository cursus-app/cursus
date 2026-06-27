/**
 * Types partagés pour le harnais de validation Cursus.
 * Consommés côté server (parsing du webhook GitHub Actions) et côté client
 * (affichage des résultats dans le dashboard formateur / profil stagiaire).
 */

// ─── Statuts d'un check individuel ────────────────────────────────────────────

export type CheckStatus = 'success' | 'failure' | 'error' | 'skipped' | 'pending';

// ─── Résultat structuré d'un check ────────────────────────────────────────────

export interface CheckResult {
  /** Identifiant technique du check (ex. 'repo_exists_public', 'tests_pass'). */
  check_id: string;
  /** Statut final du check */
  status: CheckStatus;
  /** Message lisible décrivant le résultat */
  message: string;
  /** Données additionnelles (seuils, valeurs mesurées, etc.) */
  details?: Record<string, unknown> | undefined;
  /** Durée d'exécution en millisecondes */
  durationMs?: number | undefined;
}

// ─── Forme attendue de HarnessRun.checksJson en DB ────────────────────────────

export interface ChecksJson {
  checks: CheckResult[];
}

// ─── Rapport complet d'un HarnessRun (côté affichage) ────────────────────────

export interface HarnessReport {
  checks: CheckResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  /** ISO 8601 — renseigné quand le rapport est finalisé */
  completedAt?: string | undefined;
}

// ─── Catalogue des check IDs connus au MVP ────────────────────────────────────

export const KNOWN_CHECK_IDS = [
  'repo_exists_public',
  'branch_exists',
  'pr_merged',
  'file_exists',
  'tests_pass',
  'linter_pass',
  'url_responds',
  'lighthouse_min',
  'commits_signed',
] as const;

export type KnownCheckId = (typeof KNOWN_CHECK_IDS)[number];

// ─── Types du système de dispatch/webhook (ST-06.1) ───────────────────────────

export interface HarnessDispatchPayload {
  submission_id: string;
  repo_url: string;
  deploy_url?: string | undefined;
  criteria_json: string; // JSON sérialisé de CriteriaJson
}

export interface CriteriaJson {
  checks: string[];
}

export interface HarnessWebhookPayload {
  /** run_id GitHub Actions — clé d'idempotence. */
  run_id: string;
  /** Lien direct vers le run GitHub Actions. */
  workflow_url: string;
  submission_id: string;
  /** Statut final du workflow. */
  status: 'success' | 'failure' | 'timeout' | 'cancelled';
  /** Résultats des checks individuels. */
  checks: CheckResult[];
  /** Timestamp ISO 8601 du début du run. */
  started_at: string;
  /** Timestamp ISO 8601 de la fin du run. */
  finished_at: string;
}
