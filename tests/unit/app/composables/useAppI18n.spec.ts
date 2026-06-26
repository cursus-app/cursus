// @vitest-environment node
/**
 * Tests unitaires pour useAppI18n (ST-19.3).
 *
 * Stratégie : mock de `#i18n` (alias résolu par @nuxtjs/i18n) pour tester
 * le composable sans Nuxt runtime complet.
 *
 * Ce fichier teste également la parité des clés FR/EN et l'absence de TODO
 * dans locales/en.json (CI guard).
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ref } from 'vue';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockT = vi.fn((key: string) => key);
const mockSetLocale = vi.fn();
const mockLocaleRef = ref('fr');
const mockLocalesRef = ref([
  { code: 'fr', name: 'Français', language: 'fr-FR' },
  { code: 'en', name: 'English', language: 'en-US' },
]);

vi.mock('#i18n', () => ({
  useI18n: () => ({
    t: mockT,
    locale: mockLocaleRef,
    setLocale: mockSetLocale,
    locales: mockLocalesRef,
  }),
}));

// Import après le mock
const {
  useAppI18n,
  isSupportedLocale,
  normalizeSupportedLocale,
  SUPPORTED_LOCALES,
} = await import('../../../../app/composables/useAppI18n');

// ── Helpers JSON ──────────────────────────────────────────────────────────────

const rootDir = resolve(__dirname, '../../../../');

type LocaleValue = string | LocaleJson;
type LocaleJson = { [key: string]: LocaleValue };

function readLocale(filename: string): LocaleJson {
  const raw = readFileSync(resolve(rootDir, 'locales', filename), 'utf-8');
  return JSON.parse(raw) as LocaleJson;
}

const frJson = readLocale('fr.json');
const enJson = readLocale('en.json');

/**
 * Retourne la liste de toutes les clés "feuille" (chemin complet, séparé par `.`)
 * d'un objet JSON imbriqué.
 */
function flattenKeys(obj: LocaleJson, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return flattenKeys(value as LocaleJson, fullKey);
    }
    return [fullKey];
  });
}

// ── Tests : isSupportedLocale ─────────────────────────────────────────────────

describe('isSupportedLocale', () => {
  it('retourne true pour "fr"', () => {
    expect(isSupportedLocale('fr')).toBe(true);
  });

  it('retourne true pour "en"', () => {
    expect(isSupportedLocale('en')).toBe(true);
  });

  it('retourne false pour une locale inconnue', () => {
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale('../etc/passwd')).toBe(false);
  });
});

// ── Tests : normalizeSupportedLocale ─────────────────────────────────────────

describe('normalizeSupportedLocale', () => {
  it('retourne la locale inchangée si supportée', () => {
    expect(normalizeSupportedLocale('fr')).toBe('fr');
    expect(normalizeSupportedLocale('en')).toBe('en');
  });

  it('retourne "fr" comme fallback pour une locale inconnue', () => {
    expect(normalizeSupportedLocale('de')).toBe('fr');
    expect(normalizeSupportedLocale('')).toBe('fr');
    expect(normalizeSupportedLocale('xx')).toBe('fr');
  });
});

// ── Tests : SUPPORTED_LOCALES ─────────────────────────────────────────────────

describe('SUPPORTED_LOCALES', () => {
  it('contient "fr" et "en"', () => {
    expect(SUPPORTED_LOCALES).toContain('fr');
    expect(SUPPORTED_LOCALES).toContain('en');
  });

  it('a exactement 2 locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(2);
  });
});

// ── Tests : useAppI18n composable ─────────────────────────────────────────────

describe('useAppI18n — locale computed', () => {
  it('retourne "fr" quand locale vaut "fr"', () => {
    mockLocaleRef.value = 'fr';
    const { locale } = useAppI18n();
    expect(locale.value).toBe('fr');
  });

  it('retourne "en" quand locale vaut "en"', () => {
    mockLocaleRef.value = 'en';
    const { locale } = useAppI18n();
    expect(locale.value).toBe('en');
  });

  it('fallback à "fr" pour une locale inconnue', () => {
    mockLocaleRef.value = 'de';
    const { locale } = useAppI18n();
    expect(locale.value).toBe('fr');
  });
});

describe('useAppI18n — isFr / isEn', () => {
  it('isFr est true quand locale est "fr"', () => {
    mockLocaleRef.value = 'fr';
    const { isFr, isEn } = useAppI18n();
    expect(isFr.value).toBe(true);
    expect(isEn.value).toBe(false);
  });

  it('isEn est true quand locale est "en"', () => {
    mockLocaleRef.value = 'en';
    const { isFr, isEn } = useAppI18n();
    expect(isFr.value).toBe(false);
    expect(isEn.value).toBe(true);
  });
});

describe('useAppI18n — localeOptions', () => {
  it('retourne les locales disponibles avec code, name et language', () => {
    mockLocaleRef.value = 'fr';
    const { localeOptions } = useAppI18n();
    expect(localeOptions.value).toHaveLength(2);
    expect(localeOptions.value[0]).toMatchObject({ code: 'fr', name: 'Français' });
    expect(localeOptions.value[1]).toMatchObject({ code: 'en', name: 'English' });
  });
});

describe('useAppI18n — switchLocale', () => {
  it('appelle i18nSetLocale avec la locale passée', async () => {
    mockLocaleRef.value = 'fr';
    const { switchLocale } = useAppI18n();
    await switchLocale('en');
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('appelle i18nSetLocale avec "fr"', async () => {
    mockLocaleRef.value = 'en';
    const { switchLocale } = useAppI18n();
    await switchLocale('fr');
    expect(mockSetLocale).toHaveBeenCalledWith('fr');
  });
});

describe('useAppI18n — t()', () => {
  it('t() délègue à useI18n().t', () => {
    const { t } = useAppI18n();
    t('common.save');
    expect(mockT).toHaveBeenCalledWith('common.save');
  });
});

// ── Tests CI : locales/en.json ────────────────────────────────────────────────

describe('locales/en.json — aucune clé non traduite', () => {
  it('aucune valeur ne contient "__TODO__"', () => {
    const flatEn = flattenKeys(enJson);
    const todoKeys: string[] = [];

    for (const key of flatEn) {
      // Résoudre la valeur depuis le JSON
      const parts = key.split('.');
      let value: LocaleValue = enJson;
      for (const part of parts) {
        if (typeof value === 'object' && value !== null) {
          value = (value as LocaleJson)[part] ?? '';
        }
      }
      if (typeof value === 'string' && value.includes('__TODO__')) {
        todoKeys.push(key);
      }
    }

    expect(todoKeys, `Clés non traduites : ${todoKeys.join(', ')}`).toHaveLength(0);
  });

  it('aucune valeur n\'est vide', () => {
    const flatEn = flattenKeys(enJson);
    const emptyKeys: string[] = [];

    for (const key of flatEn) {
      const parts = key.split('.');
      let value: LocaleValue = enJson;
      for (const part of parts) {
        if (typeof value === 'object' && value !== null) {
          value = (value as LocaleJson)[part] ?? '';
        }
      }
      if (typeof value === 'string' && value.trim() === '') {
        emptyKeys.push(key);
      }
    }

    expect(emptyKeys, `Clés vides : ${emptyKeys.join(', ')}`).toHaveLength(0);
  });
});

// ── Tests CI : parité FR ↔ EN ─────────────────────────────────────────────────

describe('locales — parité FR/EN (clés feuilles)', () => {
  it('EN a exactement les mêmes clés feuilles que FR', () => {
    const frKeys = flattenKeys(frJson).sort();
    const enKeys = flattenKeys(enJson).sort();

    const missingInEn = frKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !frKeys.includes(k));

    expect(
      missingInEn,
      `Clés présentes en FR mais absentes en EN : ${missingInEn.join(', ')}`,
    ).toHaveLength(0);

    expect(
      extraInEn,
      `Clés présentes en EN mais absentes en FR : ${extraInEn.join(', ')}`,
    ).toHaveLength(0);
  });

  it('FR et EN ont le même nombre de clés feuilles', () => {
    const frKeys = flattenKeys(frJson);
    const enKeys = flattenKeys(enJson);
    expect(enKeys.length).toBe(frKeys.length);
  });
});
