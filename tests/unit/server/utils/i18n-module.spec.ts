// @vitest-environment node
/**
 * Tests du module server/utils/i18n.ts — import direct du module réel.
 *
 * Ces tests complètent i18n.spec.ts (qui re-implémente la logique pour tester
 * la logique pure avec readFileSync). Ici, on importe directement les fonctions
 * exportées du module pour couvrir les branches non atteignables via emailService :
 * - branche fallback FR (locale EN + clé absente) — lignes 99-100
 * - tServerBilingual()
 * - parseAcceptLanguage()
 *
 * Note : les imports JSON statiques (fr.json, en.json) dans i18n.ts peuvent ne pas
 * se résoudre correctement dans l'environnement de test Vitest/Nuxt (les modules
 * sont initialisés différemment). Les tests ici vérifient donc le comportement
 * observable (retour de string, retour de la clé si absente, structure de retour)
 * plutôt que le contenu exact des traductions — ceux-ci sont couverts par les
 * tests purs de i18n.spec.ts (qui utilisent readFileSync).
 *
 * Cf. ST-19.4
 */
import { describe, expect, it, vi } from 'vitest';

// ── Mock du logger avant l'import du module ───────────────────────────────────
vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// ── Import dynamique du module réel (après mock, convention Vitest) ───────────
const { tServer, tServerBilingual, parseAcceptLanguage } = await import('~~/server/utils/i18n');

// ── tServer — branches spécifiques ───────────────────────────────────────────

describe('tServer (module réel) — branches', () => {
  it('retourne la cle brute (string) pour une locale FR avec une cle absente', () => {
    // Couvre: resolveKey retourne null -> branche if (resolved === null) -> return key
    const result = tServer('fr', 'cle.absente.fr');
    expect(result).toBe('cle.absente.fr');
  });

  it('retourne la cle brute pour une locale EN avec une cle absente (couvre fallback FR)', () => {
    // Couvre la branche: if (resolved === null && safeLocale !== 'fr')
    // -> essaie le fallback FR -> aussi null -> return key
    const result = tServer('en', 'cle.absente.en.et.fr');
    expect(result).toBe('cle.absente.en.et.fr');
  });

  it('retourne une string pour toute cle et locale valide', () => {
    // Couvre le chemin de base de tServer -- peu importe la valeur de traduction
    expect(typeof tServer('fr', 'common.save')).toBe('string');
    expect(typeof tServer('en', 'common.save')).toBe('string');
  });

  it('normalise les locales inconnues et retourne une string', () => {
    // normalizeSupportedLocale('de') -> 'fr'
    expect(typeof tServer('de', 'common.save')).toBe('string');
    expect(typeof tServer('', 'common.save')).toBe('string');
  });

  it('retourne une string meme avec des params', () => {
    const result = tServer('fr', 'molecules.dataTable.pageInfo', { page: 1, total: 5 });
    expect(typeof result).toBe('string');
  });
});

// ── tServerBilingual — couverture directe ─────────────────────────────────────

describe('tServerBilingual (module réel)', () => {
  it('retourne un objet avec les proprietes fr et en', () => {
    // Couvre tServerBilingual() -- structure de retour garantie
    const result = tServerBilingual('common.save');
    expect(result).toHaveProperty('fr');
    expect(result).toHaveProperty('en');
  });

  it('les valeurs fr et en sont des strings', () => {
    const result = tServerBilingual('auth.login');
    expect(typeof result.fr).toBe('string');
    expect(typeof result.en).toBe('string');
  });

  it('retourne la cle brute en fr et en si absente', () => {
    const result = tServerBilingual('inexistante.key.xyz');
    expect(result.fr).toBe('inexistante.key.xyz');
    expect(result.en).toBe('inexistante.key.xyz');
  });

  it('supporte les parametres et retourne des strings', () => {
    const result = tServerBilingual('molecules.dataTable.pageInfo', { page: 1, total: 5 });
    expect(typeof result.fr).toBe('string');
    expect(typeof result.en).toBe('string');
  });
});

// ── parseAcceptLanguage — couverture directe ──────────────────────────────────

describe('parseAcceptLanguage (module réel)', () => {
  it('retourne "fr" pour un header vide', () => {
    expect(parseAcceptLanguage('')).toBe('fr');
  });

  it('retourne "en" pour "en-US,en;q=0.9"', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('retourne "fr" pour "fr-FR,fr;q=0.9"', () => {
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9')).toBe('fr');
  });

  it('respecte les qualites : fr en priorite', () => {
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('fr');
  });

  it('respecte les qualites : en en priorite', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9,fr;q=0.8')).toBe('en');
  });

  it('retourne "fr" pour une langue inconnue', () => {
    expect(parseAcceptLanguage('de-DE,de;q=0.9')).toBe('fr');
  });

  it('retourne "fr" pour plusieurs langues non supportees', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=0.9,ja;q=0.8')).toBe('fr');
  });

  it('gere un header sans q-value', () => {
    expect(parseAcceptLanguage('en')).toBe('en');
  });
});
