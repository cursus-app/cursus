// @vitest-environment node
/**
 * Tests unitaires pour server/utils/respondError.ts (ST-19.4 / TT-19.4.4).
 *
 * Tests :
 * - retourne un H3Error avec le bon statusCode, message et data
 * - utilise la locale du context (event.context['locale'])
 * - fallback a 'fr' si la locale est absente du context
 * - passe le statusCode personnalise si fourni
 * - passe les data additionnelles si fournies
 */
import { describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock du logger (importe par i18n.ts qui est importe par respondError.ts)
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

// Mock de tServer pour isoler respondError de la logique de traduction
vi.mock('~~/server/utils/i18n', () => ({
  tServer: vi.fn((locale: string, key: string) => `[${locale}] ${key}`),
  tServerBilingual: vi.fn(),
  parseAcceptLanguage: vi.fn(),
}));

// Import dynamique apres les mocks (convention Vitest)
const { respondError } = await import('~~/server/utils/respondError');

// ── Helper : créer un faux H3Event ─────────────────────────────────────────────

function makeFakeEvent(locale?: string): H3Event {
  return {
    context: locale !== undefined ? { locale } : {},
    // @ts-expect-error -- H3Event minimal pour les tests unitaires
    node: { req: {}, res: {} },
  } as unknown as H3Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('respondError', () => {
  it('retourne un H3Error avec statusCode 400 par defaut', () => {
    const event = makeFakeEvent('fr');
    const err = respondError(event, 'auth.errors.invalid');
    expect(err.statusCode).toBe(400);
  });

  it('utilise la locale du context pour tServer', async () => {
    const { tServer } = await import('~~/server/utils/i18n');
    const event = makeFakeEvent('en');
    respondError(event, 'common.error');
    expect(tServer).toHaveBeenCalledWith('en', 'common.error', undefined);
  });

  it('fallback a "fr" si event.context.locale est absent', async () => {
    const { tServer } = await import('~~/server/utils/i18n');
    const event = makeFakeEvent(); // pas de locale
    respondError(event, 'errors.generic');
    expect(tServer).toHaveBeenCalledWith('fr', 'errors.generic', undefined);
  });

  it('retourne le statusCode personnalise', () => {
    const event = makeFakeEvent('fr');
    const err = respondError(event, 'cursus.notFound', undefined, { statusCode: 404 });
    expect(err.statusCode).toBe(404);
  });

  it('inclut la cle errorKey dans data.code', () => {
    const event = makeFakeEvent('fr');
    const err = respondError(event, 'auth.errors.invalid');
    expect(err.data).toMatchObject({ code: 'auth.errors.invalid' });
  });

  it('fusionne les data additionnelles', () => {
    const event = makeFakeEvent('fr');
    const err = respondError(event, 'auth.errors.locked', undefined, {
      statusCode: 423,
      data: { lockedUntil: '2026-06-27T12:00:00Z' },
    });
    expect(err.data).toMatchObject({
      code: 'auth.errors.locked',
      lockedUntil: '2026-06-27T12:00:00Z',
    });
  });

  it("passe les params d'interpolation a tServer", async () => {
    const { tServer } = await import('~~/server/utils/i18n');
    const event = makeFakeEvent('fr');
    const params = { count: 3 };
    respondError(event, 'cursus.modules.count', params);
    expect(tServer).toHaveBeenCalledWith('fr', 'cursus.modules.count', params);
  });
});
