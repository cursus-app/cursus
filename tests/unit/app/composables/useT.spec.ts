// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// useT dépend de `useI18n` exposé par @nuxtjs/i18n via l'alias `#i18n`.
// En contexte Vitest (hors Nuxt), cet alias n'existe pas — on le mock avant
// l'import du composable pour éviter un crash de résolution de module.

const mockT = vi.fn((key: string) => key);
const mockSetLocale = vi.fn();
const mockLocale = { value: 'fr' };
const mockLocales = { value: [{ code: 'fr' }, { code: 'en' }] };

vi.mock('#i18n', () => ({
  useI18n: () => ({
    t: mockT,
    locale: mockLocale,
    setLocale: mockSetLocale,
    locales: mockLocales,
  }),
}));

// Import après le mock pour que la résolution soit interceptée
const { useT } = await import('../../../../app/composables/useT');

// ── Lecture JSON brute ────────────────────────────────────────────────────────
// On utilise readFileSync + JSON.parse plutôt que `import` ESM car @nuxtjs/i18n
// transforme les imports JSON de locales en MessageFunctions compilées (ICU),
// ce qui rend `typeof value === 'string'` faux dans l'environnement de test Nuxt.
// Les tests de structure portent sur le JSON brut (source de vérité).

const rootDir = resolve('/Users/sadjad/Dev/perso/cursus/.claude/worktrees/agent-a62c0756b66938fea');

type LocaleJson = Record<string, Record<string, string>>;

function readLocale(filename: string): LocaleJson {
  const raw = readFileSync(resolve(rootDir, 'locales', filename), 'utf-8');
  return JSON.parse(raw) as LocaleJson;
}

const frJson = readLocale('fr.json');
const enJson = readLocale('en.json');

// ── Tests composable ─────────────────────────────────────────────────────────

describe('composables/useT', () => {
  it('retourne t, locale, setLocale et locales', () => {
    const { t, locale, setLocale, locales } = useT();
    expect(typeof t).toBe('function');
    expect(locale).toBe(mockLocale);
    expect(setLocale).toBe(mockSetLocale);
    expect(locales).toBe(mockLocales);
  });

  it('t() délègue à useI18n().t', () => {
    const { t } = useT();
    t('common.save');
    expect(mockT).toHaveBeenCalledWith('common.save');
  });
});

// ── Helpers de validation locale ──────────────────────────────────────────────

/** Vérifie qu'un namespace de locale contient toutes les clés attendues en tant que strings non vides. */
function assertNamespaceKeys(locale: LocaleJson, namespace: string, keys: string[]): void {
  const ns = locale[namespace];
  expect(ns, `namespace "${namespace}" doit exister`).toBeDefined();
  if (!ns) {
    return;
  } // narrowing pour éviter les non-null assertions
  for (const key of keys) {
    expect(ns, `clé "${namespace}.${key}" doit exister`).toHaveProperty(key);
    expect(typeof ns[key], `"${namespace}.${key}" doit être une string`).toBe('string');
    expect(ns[key], `"${namespace}.${key}" ne doit pas être vide`).not.toBe('');
  }
}

// ── locales/fr.json ──────────────────────────────────────────────────────────

describe('locales/fr.json — namespace app', () => {
  it('contient name et tagline', () => {
    assertNamespaceKeys(frJson, 'app', ['name', 'tagline']);
  });
});

describe('locales/fr.json — namespace common', () => {
  it('contient toutes les clés communes', () => {
    assertNamespaceKeys(frJson, 'common', [
      'loading',
      'retry',
      'save',
      'cancel',
      'submit',
      'delete',
      'edit',
      'back',
      'next',
      'previous',
      'close',
    ]);
  });
});

describe('locales/fr.json — namespace auth', () => {
  it('contient toutes les clés auth', () => {
    assertNamespaceKeys(frJson, 'auth', [
      'login',
      'logout',
      'email',
      'password',
      'magicLink',
      'githubLogin',
    ]);
  });
});

describe('locales/fr.json — namespace errors', () => {
  it('contient toutes les clés errors', () => {
    assertNamespaceKeys(frJson, 'errors', ['generic', 'notFound', 'unauthorized', 'supportRef']);
  });
});

// ── locales/en.json ──────────────────────────────────────────────────────────

describe('locales/en.json — namespace app', () => {
  it('contient name et tagline', () => {
    assertNamespaceKeys(enJson, 'app', ['name', 'tagline']);
  });
});

describe('locales/en.json — namespace common', () => {
  it('contient toutes les clés communes', () => {
    assertNamespaceKeys(enJson, 'common', [
      'loading',
      'retry',
      'save',
      'cancel',
      'submit',
      'delete',
      'edit',
      'back',
      'next',
      'previous',
      'close',
    ]);
  });
});

describe('locales/en.json — namespace auth', () => {
  it('contient toutes les clés auth', () => {
    assertNamespaceKeys(enJson, 'auth', [
      'login',
      'logout',
      'email',
      'password',
      'magicLink',
      'githubLogin',
    ]);
  });
});

describe('locales/en.json — namespace errors', () => {
  it('contient toutes les clés errors', () => {
    assertNamespaceKeys(enJson, 'errors', ['generic', 'notFound', 'unauthorized', 'supportRef']);
  });
});

// ── Parité FR/EN ──────────────────────────────────────────────────────────────

describe('locales — parité FR/EN', () => {
  it('EN a exactement les mêmes namespaces que FR', () => {
    expect(Object.keys(enJson).sort()).toEqual(Object.keys(frJson).sort());
  });

  it('EN a exactement les mêmes clés que FR dans chaque namespace', () => {
    for (const namespace of Object.keys(frJson)) {
      const enNs = enJson[namespace];
      const frNs = frJson[namespace];
      expect(enNs, `namespace EN "${namespace}" doit exister`).toBeDefined();
      expect(frNs, `namespace FR "${namespace}" doit exister`).toBeDefined();
      if (!enNs || !frNs) {
        continue;
      }
      expect(Object.keys(enNs).sort(), `namespace "${namespace}"`).toEqual(
        Object.keys(frNs).sort(),
      );
    }
  });
});
