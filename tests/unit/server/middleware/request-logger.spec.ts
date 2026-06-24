// @vitest-environment node
//
// Tests unitaires du middleware 01.request-logger.ts.
// Le middleware importe explicitement depuis h3 (pas d'auto-imports Nitro)
// pour permettre ce type de test unitaire sans serveur Nitro complet.
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- État partagé pour les mocks --------------------------------------------

const mockResponseHeaders: Record<string, string> = {};
let mockRequestId: string | null = null;
let mockUrl = '/api/test';

// --- Mocks ------------------------------------------------------------------

// h3 : on intercept les helpers de lecture/écriture d'en-têtes et d'URL.
// defineEventHandler est un pass-through (identité) pour exposer la fonction handler.
vi.mock('h3', () => ({
  defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  getHeader: (_event: unknown, name: string) =>
    name === 'x-request-id' ? mockRequestId : null,
  setHeader: (_event: unknown, name: string, value: string) => {
    mockResponseHeaders[name] = value;
  },
  getRequestURL: (_event: unknown) => new URL(`http://localhost${mockUrl}`),
}));

// logger : on capture les appels du child logger
const mockChildInfo = vi.fn();
vi.mock('~~/server/utils/logger', () => ({
  childLogger: (_context: Record<string, unknown>) => ({
    info: mockChildInfo,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

// --- Helpers ----------------------------------------------------------------

/** Construit un event H3-like minimal suffisant pour le middleware. */
function buildEvent(overrides?: { requestId?: string; url?: string }) {
  mockRequestId = overrides?.requestId ?? null;
  mockUrl = overrides?.url ?? '/api/test';

  const nodeRes = new EventEmitter() as EventEmitter & { statusCode: number };
  nodeRes.statusCode = 200;

  return {
    method: 'GET',
    context: {} as Record<string, unknown>,
    node: { res: nodeRes },
  };
}

// --- Tests ------------------------------------------------------------------

// On importe le module UNE seule fois (les mocks sont déjà en place via vi.mock hoisting).
// `vi.clearAllMocks()` dans beforeEach suffit à remettre les compteurs à zéro.
const { default: requestLoggerHandler } = await import(
  '~~/server/middleware/01.request-logger'
);

describe('server/middleware/01.request-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Vider les headers capturés
    for (const k of Object.keys(mockResponseHeaders)) {
      Reflect.deleteProperty(mockResponseHeaders, k);
    }
  });

  it('injecte x-request-id dans les headers de réponse', () => {
    const event = buildEvent();
    requestLoggerHandler(event);

    expect(mockResponseHeaders['x-request-id']).toBeDefined();
    expect(typeof mockResponseHeaders['x-request-id']).toBe('string');
    expect(String(mockResponseHeaders['x-request-id']).length).toBeGreaterThan(0);
  });

  it('définit event.context.logger après exécution', () => {
    const event = buildEvent();
    requestLoggerHandler(event);

    expect(event.context['logger']).toBeDefined();
    expect(typeof event.context['logger']).toBe('object');
  });

  it('définit event.context.traceId après exécution', () => {
    const event = buildEvent();
    requestLoggerHandler(event);

    expect(event.context['traceId']).toBeDefined();
    expect(typeof event.context['traceId']).toBe('string');
    expect((event.context['traceId'] as string).length).toBeGreaterThan(0);
  });

  it("réutilise l'en-tête x-request-id fourni par le client", () => {
    const event = buildEvent({ requestId: 'abc123-custom-trace-id' });
    requestLoggerHandler(event);

    expect(event.context['traceId']).toBe('abc123-custom-trace-id');
    expect(mockResponseHeaders['x-request-id']).toBe('abc123-custom-trace-id');
  });

  it('génère un traceId unique quand x-request-id est absent', () => {
    const event1 = buildEvent();
    requestLoggerHandler(event1);
    const event2 = buildEvent();
    requestLoggerHandler(event2);

    const id1 = event1.context['traceId'] as string;
    const id2 = event2.context['traceId'] as string;
    expect(id1).not.toBe(id2);
  });

  it("logue 'req' à l'entrée avec method et url", () => {
    const event = buildEvent({ url: '/api/health' });
    requestLoggerHandler(event);

    expect(mockChildInfo).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/health' }),
      'req',
    );
  });

  it("logue 'res' à la fin avec status et durationMs", () => {
    const event = buildEvent({ url: '/api/health' });
    requestLoggerHandler(event);

    // Simuler la fin de la réponse Node.js
    (event.node.res as EventEmitter).emit('finish');

    expect(mockChildInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/api/health',
        status: 200,
        durationMs: expect.any(Number),
      }),
      'res',
    );
  });

  it('tronque les x-request-id plus longs que 36 caractères', () => {
    // UUID v4 = 36 chars. Valide la défense contre les IDs mal formés reçus du CDN.
    const longId = 'a'.repeat(100);
    const event = buildEvent({ requestId: longId });
    requestLoggerHandler(event);

    expect((event.context['traceId'] as string).length).toBe(36);
    expect(String(mockResponseHeaders['x-request-id']).length).toBe(36);
  });
});
