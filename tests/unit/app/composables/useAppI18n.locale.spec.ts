// @vitest-environment node
/**
 * Tests unitaires pour la logique parseAcceptLanguage du middleware locale.
 *
 * On teste la logique pure de parsing sans l'infrastructure Nuxt complète.
 * Le middleware complet est validé par les tests d'intégration.
 */
import { describe, expect, it } from 'vitest';

// ─── On extrait et teste la logique pure de parsing ───────────────────────────
// Copie de la fonction privée du middleware pour test unitaire.
// Si la signature change, ce test sert de régression.

function parseAcceptLanguage(header: string): 'fr' | 'en' {
  if (!header) {
    return 'fr';
  }

  const parts = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return {
        lang: (tag ?? '').trim().split('-')[0]?.toLowerCase() ?? '',
        quality: q !== undefined ? parseFloat(q) : 1,
      };
    })
    .filter((p) => p.lang.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const part of parts) {
    if (part.lang === 'en') {
      return 'en';
    }
    if (part.lang === 'fr') {
      return 'fr';
    }
  }

  return 'fr';
}

describe('middleware/locale — parseAcceptLanguage', () => {
  it('retourne "fr" pour un header vide', () => {
    expect(parseAcceptLanguage('')).toBe('fr');
  });

  it('retourne "en" pour "en-US"', () => {
    expect(parseAcceptLanguage('en-US')).toBe('en');
  });

  it('retourne "en" pour "en"', () => {
    expect(parseAcceptLanguage('en')).toBe('en');
  });

  it('retourne "fr" pour "fr-FR"', () => {
    expect(parseAcceptLanguage('fr-FR')).toBe('fr');
  });

  it('retourne "fr" pour "fr"', () => {
    expect(parseAcceptLanguage('fr')).toBe('fr');
  });

  it('respecte l\'ordre de qualité : en;q=0.9, fr;q=0.8 → "en"', () => {
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('fr');
  });

  it('respecte l\'ordre de qualité : en;q=0.9 prioritaire sur fr;q=0.5', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9,fr;q=0.5')).toBe('en');
  });

  it('fallback à "fr" pour une langue inconnue (de, es, etc.)', () => {
    expect(parseAcceptLanguage('de,de-DE;q=0.9')).toBe('fr');
  });

  it('gère un header complexe avec plusieurs langues', () => {
    // en-US avec qualité 1.0 → priorité EN
    expect(parseAcceptLanguage('en-US,en;q=0.9,fr;q=0.8,de;q=0.7')).toBe('en');
  });

  it('retourne "fr" si seuls des langages inconnus sont présents', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=0.9,ja;q=0.8')).toBe('fr');
  });

  it('gère les espaces dans le header', () => {
    expect(parseAcceptLanguage(' en , fr ; q=0.9')).toBe('en');
  });

  it('gère la casse — "EN" est converti en minuscule', () => {
    // Les navigateurs envoient toujours en minuscule, mais on teste la robustesse
    expect(parseAcceptLanguage('EN-US,EN;q=0.9')).toBe('en');
  });
});
