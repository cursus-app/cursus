// @vitest-environment node
/**
 * Tests unitaires du middleware 02.resolve-locale.ts (ST-19.4).
 *
 * Ce middleware pose event.context.locale à partir du cookie i18n_redirected
 * ou du header Accept-Language.
 * On mock les helpers h3 pour tester la logique sans serveur Nitro complet.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── État partagé des mocks ────────────────────────────────────────────────────

let mockCookieValue: string | undefined = undefined;
let mockAcceptLanguage: string | null = null;

// ── Mocks h3 ──────────────────────────────────────────────────────────────────

vi.mock('h3', () => ({
  defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  getCookie: (_event: unknown, _key: string) => mockCookieValue,
  getHeader: (_event: unknown, _name: string) => mockAcceptLanguage,
}));

// Mock de server/utils/i18n pour parseAcceptLanguage (logique testée séparément)
vi.mock('~~/server/utils/i18n', () => ({
  parseAcceptLanguage: (header: string) => {
    if (!header) {return 'fr';}
    const lower = header.toLowerCase();
    if (lower.includes('en')) {return 'en';}
    if (lower.includes('fr')) {return 'fr';}
    return 'fr';
  },
  tServer: vi.fn((locale: string, key: string) => `${locale}:${key}`),
  tServerBilingual: vi.fn(),
}));

vi.mock('~~/shared/types/locale', () => ({
  normalizeSupportedLocale: (value: string): 'fr' | 'en' => {
    if (value === 'en') {return 'en';}
    return 'fr';
  },
  isSupportedLocale: (value: string) => value === 'fr' || value === 'en',
  SUPPORTED_LOCALES: ['fr', 'en'] as const,
}));

// ── Import du middleware après les mocks ──────────────────────────────────────

const { default: resolveLocaleHandler } = await import(
  '~~/server/middleware/02.resolve-locale'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEvent(overrides?: { context?: Record<string, unknown> }) {
  return {
    context: {
      ...overrides?.context,
    } as Record<string, unknown>,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('middleware/02.resolve-locale — cookie i18n_redirected', () => {
  beforeEach(() => {
    mockCookieValue = undefined;
    mockAcceptLanguage = null;
  });

  it('pose locale = "en" si le cookie vaut "en"', () => {
    mockCookieValue = 'en';
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('en');
  });

  it('pose locale = "fr" si le cookie vaut "fr"', () => {
    mockCookieValue = 'fr';
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });

  it('normalise une valeur de cookie inconnue à "fr"', () => {
    mockCookieValue = 'de'; // langue non supportée
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });

  it('le cookie a la priorité sur Accept-Language', () => {
    mockCookieValue = 'fr'; // cookie FR
    mockAcceptLanguage = 'en-US'; // header EN
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });
});

describe('middleware/02.resolve-locale — Accept-Language (sans cookie)', () => {
  beforeEach(() => {
    mockCookieValue = undefined;
    mockAcceptLanguage = null;
  });

  it('pose locale = "en" si Accept-Language contient "en"', () => {
    mockAcceptLanguage = 'en-US,en;q=0.9';
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('en');
  });

  it('pose locale = "fr" si Accept-Language contient "fr"', () => {
    mockAcceptLanguage = 'fr-FR,fr;q=0.9';
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });

  it('pose locale = "fr" (fallback) si Accept-Language est vide', () => {
    mockAcceptLanguage = '';
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });

  it('pose locale = "fr" (fallback) si Accept-Language est null', () => {
    mockAcceptLanguage = null;
    const event = buildEvent();
    resolveLocaleHandler(event);
    expect(event.context['locale']).toBe('fr');
  });
});
