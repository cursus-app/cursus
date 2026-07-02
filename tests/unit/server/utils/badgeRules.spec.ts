// @vitest-environment node
/**
 * Tests unitaires pour badgeRules.ts (ST-11.2).
 * Vérifie la correspondance check_id → badge codes.
 */

import { describe, expect, it } from 'vitest';
import { matchBadgesForChecks, BADGE_DEFINITIONS } from '~~/server/utils/badgeRules';

describe('matchBadgesForChecks', () => {
  it('retourne les slugs corrects pour des check_id correspondants', () => {
    const result = matchBadgesForChecks(new Set(['url_responds']));
    expect(result).toContain('premier-deploy');
  });

  it('retourne [] pour un Set vide', () => {
    expect(matchBadgesForChecks(new Set())).toEqual([]);
  });

  it('retourne [] si aucun check ne correspond à un badge', () => {
    const result = matchBadgesForChecks(new Set(['check_inconnu', 'autre_check']));
    expect(result).toEqual([]);
  });

  it('retourne tous les slugs correspondants si plusieurs checks matchent', () => {
    const result = matchBadgesForChecks(
      new Set(['url_responds', 'commits_signed', 'all_modules_validated']),
    );
    expect(result).toContain('premier-deploy');
    expect(result).toContain('commit-signe');
    expect(result).toContain('cursus-complet');
    expect(result).toHaveLength(3);
  });

  it('ne retourne jamais les badges manuels (trigger=manual)', () => {
    // On fournit un Set contenant n'importe quelle valeur
    const allPossibleCheckIds = new Set(
      BADGE_DEFINITIONS.filter((b) => b.checkId !== undefined).map((b) => b.checkId as string),
    );
    // Ajoute des check fictifs pour s'assurer que rien ne matche les badges manuels
    allPossibleCheckIds.add('mentor-du-jour');
    allPossibleCheckIds.add('manual');

    const result = matchBadgesForChecks(allPossibleCheckIds);

    // Aucun badge manuel ne doit figurer dans les résultats
    const manualCodes = BADGE_DEFINITIONS.filter((b) => b.trigger === 'manual').map((b) => b.code);
    for (const code of manualCodes) {
      expect(result).not.toContain(code);
    }
  });

  it('correspond au badge capstone-en-avance si delivered_early est dans les checks', () => {
    const result = matchBadgesForChecks(new Set(['delivered_early']));
    expect(result).toContain('capstone-en-avance');
  });

  it('ignore les check_id qui ne correspondent à aucun badge', () => {
    const result = matchBadgesForChecks(
      new Set(['url_responds', 'lighthouse_score', 'readme_present']),
    );
    // Seul url_responds correspond à un badge
    expect(result).toContain('premier-deploy');
    expect(result).toHaveLength(1);
  });
});
