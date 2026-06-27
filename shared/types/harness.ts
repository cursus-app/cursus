// Types partagés pour le harnais de validation automatique (EP-06).
// Utilisés côté server (handler webhook, utils) ET côté client (affichage résultats).

/**
 * Résultat d'un check individuel retourné par le runner GitHub Actions.
 * Stocké dans HarnessRun.checksJson.checks[].
 */
export interface CheckResult {
  /** Identifiant technique du check (ex. 'repo_exists_public', 'tests_pass'). */
  check_id: string;
  /** Statut final du check. */
  status: 'success' | 'failure' | 'error' | 'skipped';
  /** Message lisible (affiché au stagiaire). */
  message: string;
  /** Détails supplémentaires (stack trace, diff, logs…). Optionnel. */
  details?: unknown;
}

/**
 * Forme attendue de HarnessRun.checksJson en DB.
 */
export interface ChecksJson {
  checks: CheckResult[];
}

/**
 * Payload envoyé à GitHub Actions via workflow_dispatch.
 */
export interface HarnessDispatchPayload {
  submission_id: string;
  repo_url: string;
  deploy_url?: string;
  criteria_json: string; // JSON sérialisé de CriteriaJson
}

/**
 * Critères transmis au runner pour déterminer quels checks exécuter.
 */
export interface CriteriaJson {
  checks: string[];
}

/**
 * Payload reçu depuis le webhook GitHub Actions une fois le run terminé.
 */
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
