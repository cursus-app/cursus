/**
 * Types partagés pour le harnais de validation Cursus.
 * Consommés côté server (parsing du webhook GitHub Actions) et côté client
 * (affichage des résultats dans le dashboard formateur / profil stagiaire).
 */

// ─── Statuts d'un check individuel ────────────────────────────────────────────

export type CheckStatus = 'success' | 'failure' | 'error' | 'skipped' | 'pending';

// ─── Résultat structuré d'un check ────────────────────────────────────────────

export interface CheckResult {
  /** Identifiant unique du check (ex: "repo_exists_public") */
  checkId: string;
  /** Statut final du check */
  status: CheckStatus;
  /** Message lisible décrivant le résultat */
  message: string;
  /** Données additionnelles (seuils, valeurs mesurées, etc.) */
  details?: Record<string, unknown> | undefined;
  /** Durée d'exécution en millisecondes */
  durationMs?: number | undefined;
}

// ─── Rapport complet d'un HarnessRun ─────────────────────────────────────────

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

// ─── Catalogue des check IDs connus au MVP ─────────────────────────────────────

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
