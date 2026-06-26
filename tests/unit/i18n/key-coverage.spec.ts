// @vitest-environment node
/**
 * Tests de couverture des clés i18n.
 *
 * Vérifie :
 *   - Parité structurelle complète (récursive) entre fr.json et en.json
 *   - Aucune valeur feuille vide ou __TODO__ dans fr.json (source de vérité)
 *   - Cohérence des namespaces de premier niveau
 *   - Présence et complétude du namespace « index » ajouté en ST-19.2
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// tests/unit/i18n/ → remonter 3 niveaux pour atteindre la racine du repo
const rootDir = resolve(__dirname, '../../../');

// ── Types ─────────────────────────────────────────────────────────────────────

type LocaleValue = string | NestedLocale;
interface NestedLocale {
  [key: string]: LocaleValue;
}
type LocaleJson = Record<string, LocaleValue>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLocale(filename: string): LocaleJson {
  const raw = readFileSync(resolve(rootDir, 'locales', filename), 'utf-8');
  return JSON.parse(raw) as LocaleJson;
}

/**
 * Collect all dot-separated leaf-key paths from a locale object.
 * e.g. { auth: { errors: { emailInvalid: 'foo' } } } → ['auth.errors.emailInvalid']
 */
function collectLeafPaths(obj: LocaleValue, prefix = ''): string[] {
  if (typeof obj === 'string') {
    return prefix ? [prefix] : [];
  }
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj as NestedLocale)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      paths.push(fullKey);
    } else {
      paths.push(...collectLeafPaths(value, fullKey));
    }
  }
  return paths;
}

/** Traverse a nested locale object along a dot-separated key path. */
function getNestedValue(obj: LocaleJson, keyPath: string): LocaleValue | undefined {
  const parts = keyPath.split('.');
  let current: LocaleValue | undefined = obj as LocaleValue;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as NestedLocale)[part];
  }
  return current;
}

// ── Fixture ───────────────────────────────────────────────────────────────────

const frJson = readLocale('fr.json');
const enJson = readLocale('en.json');

const frLeafs = collectLeafPaths(frJson);
const enLeafs = collectLeafPaths(enJson);

// ── Suite 1 : namespaces de premier niveau ────────────────────────────────────

describe('i18n — namespaces de premier niveau', () => {
  it('fr.json et en.json partagent exactement les mêmes namespaces', () => {
    expect(Object.keys(frJson).sort()).toEqual(Object.keys(enJson).sort());
  });
});

// ── Suite 2 : parité structurelle récursive ───────────────────────────────────

describe('i18n — parité structurelle fr ↔ en (récursive)', () => {
  it('chaque clé feuille de fr.json existe dans en.json', () => {
    const missing = frLeafs.filter((k) => getNestedValue(enJson, k) === undefined);
    expect(
      missing,
      `Clés feuilles présentes dans fr.json mais absentes d'en.json : ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('chaque clé feuille de en.json existe dans fr.json', () => {
    const missing = enLeafs.filter((k) => getNestedValue(frJson, k) === undefined);
    expect(
      missing,
      `Clés feuilles présentes dans en.json mais absentes de fr.json : ${missing.join(', ')}`,
    ).toHaveLength(0);
  });
});

// ── Suite 3 : qualité des valeurs fr.json ─────────────────────────────────────

describe('i18n — qualité des valeurs fr.json (source de vérité)', () => {
  it('aucune clé feuille ne doit avoir une valeur vide', () => {
    const empty = frLeafs.filter((k) => {
      const v = getNestedValue(frJson, k);
      return typeof v === 'string' && v.trim() === '';
    });
    expect(empty, `Valeurs vides dans fr.json : ${empty.join(', ')}`).toHaveLength(0);
  });

  it('aucune clé feuille ne doit valoir __TODO__', () => {
    const todos = frLeafs.filter((k) => getNestedValue(frJson, k) === '__TODO__');
    expect(todos, `Valeurs __TODO__ dans fr.json : ${todos.join(', ')}`).toHaveLength(0);
  });
});

// ── Suite 4 : namespace « index » (ST-19.2) ───────────────────────────────────

describe('i18n — namespace index (ST-19.2)', () => {
  const requiredTopKeys = ['description', 'learnMore', 'systemStatus', 'refresh', 'version'];
  const requiredStatusKeys = ['checking', 'error', 'ok', 'degraded'];

  for (const locale of ['fr', 'en'] as const) {
    const json = locale === 'fr' ? frJson : enJson;

    it(`${locale}.json contient le namespace « index »`, () => {
      expect(json['index'], `namespace "index" absent de ${locale}.json`).toBeDefined();
      expect(typeof json['index']).toBe('object');
    });

    it(`${locale}.json — index contient toutes les clés de premier niveau requises`, () => {
      const index = json['index'] as NestedLocale | undefined;
      if (!index) {
        return; // déjà échoué ci-dessus
      }
      for (const key of requiredTopKeys) {
        expect(index, `"index.${key}" absent de ${locale}.json`).toHaveProperty(key);
        expect(typeof index[key], `"index.${key}" doit être une string dans ${locale}.json`).toBe(
          'string',
        );
      }
    });

    it(`${locale}.json — index.status contient les 4 états`, () => {
      const index = json['index'] as NestedLocale | undefined;
      if (!index) {
        return;
      }
      const status = index['status'] as NestedLocale | undefined;
      expect(status, `"index.status" absent de ${locale}.json`).toBeDefined();
      if (!status) {
        return;
      }
      for (const key of requiredStatusKeys) {
        expect(status, `"index.status.${key}" absent de ${locale}.json`).toHaveProperty(key);
        expect(
          typeof status[key],
          `"index.status.${key}" doit être une string dans ${locale}.json`,
        ).toBe('string');
        expect(
          status[key] as string,
          `"index.status.${key}" ne doit pas être vide dans ${locale}.json`,
        ).not.toBe('');
      }
    });
  }
});
