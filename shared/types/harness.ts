// Types partagés pour le harnais de validation automatique (EP-06).
// Utilisés côté server (handler webhook, utils) ET côté client (affichage résultats).
// ST-06.3 : types enrichis pour le rapport lisible (cartes par check).

/** Statut d'un check individuel. */
export type CheckStatus = 'success' | 'failure' | 'error' | 'skipped' | 'pending';

/**
 * Résultat d'un check individuel retourné par le runner GitHub Actions.
 * Stocké dans HarnessRun.checksJson.checks[].
 */
export interface CheckResult {
  /** Identifiant technique du check (ex : "repo_exists_public"). */
  checkId: string;
  /** Statut du check. */
  status: CheckStatus;
  /** Message humain fourni par le harnais. */
  message: string;
  /** Détails techniques bruts (JSON freeform). */
  details?: Record<string, unknown>;
  /** Durée d'exécution en millisecondes. */
  durationMs?: number;
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

/** Rapport complet d'un run harnais. */
export interface HarnessReport {
  /** Liste des résultats par check. */
  checks: CheckResult[];
  /** Récapitulatif global. */
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  /** Date de fin d'exécution ISO 8601. */
  completedAt?: string;
}
