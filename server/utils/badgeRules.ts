/**
 * Moteur de règles badges — ST-11.2.
 *
 * Source de vérité des définitions de badges et de la logique de correspondance.
 * Découplé de la base de données : les `code` doivent correspondre aux valeurs
 * `Badge.code` insérées en DB (seeds ou migrations de données).
 *
 * Complexité : O(n × m) où n = nombre de badges, m = nombre de checks.
 * Avec 5 badges initiaux, c'est négligeable.
 */

export type BadgeTrigger = 'check_success' | 'manual';

export interface BadgeDefinition {
  /** Identifiant unique — correspond à `Badge.code` en base. */
  code: string;
  name: string;
  description: string;
  /** Nom d'icône Tabler outline (i-tabler-*). */
  icon: string;
  /** Déclencheur : automatique via check ou attribution manuelle. */
  trigger: BadgeTrigger;
  /** check_id du harnais à matcher — requis si trigger === 'check_success'. */
  checkId?: string;
}

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    code: 'premier-deploy',
    name: 'Premier deploy',
    description: 'Premier livrable avec URL accessible validé.',
    icon: 'i-tabler-rocket',
    trigger: 'check_success',
    checkId: 'url_responds',
  },
  {
    code: 'commit-signe',
    name: 'Commit signé',
    description: 'Premier commit GPG signé validé.',
    icon: 'i-tabler-git-commit',
    trigger: 'check_success',
    checkId: 'commits_signed',
  },
  {
    code: 'cursus-complet',
    name: 'Cursus complet',
    description: 'Tous les modules du cursus validés.',
    icon: 'i-tabler-certificate',
    trigger: 'check_success',
    checkId: 'all_modules_validated',
  },
  {
    code: 'mentor-du-jour',
    name: 'Mentor du jour',
    description: 'Attribué manuellement par un formateur.',
    icon: 'i-tabler-user-star',
    trigger: 'manual',
  },
  {
    // "Capstone en avance" via check harnais dédié
    code: 'capstone-en-avance',
    name: 'Capstone en avance',
    description: "Capstone soumis au moins 3 jours avant l'échéance.",
    icon: 'i-tabler-clock-fast',
    trigger: 'check_success',
    checkId: 'delivered_early',
  },
] as const;

/**
 * Retourne les `code` de badges correspondant à un ensemble de check_id réussis.
 * Les badges `manual` sont toujours exclus (non déclenchables par un check).
 *
 * @param successfulCheckIds - Set des check_id ayant le statut 'success'.
 * @returns Tableau des codes de badges à attribuer.
 */
export function matchBadgesForChecks(successfulCheckIds: Set<string>): string[] {
  return BADGE_DEFINITIONS.filter(
    (b): b is BadgeDefinition & { checkId: string } =>
      b.trigger === 'check_success' && b.checkId !== undefined && successfulCheckIds.has(b.checkId),
  ).map((b) => b.code);
}
