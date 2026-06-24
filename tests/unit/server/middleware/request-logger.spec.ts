// @vitest-environment node
//
// Tests unitaires du middleware 01.request-logger.ts.
// Le middleware utilise des auto-imports Nitro (defineEventHandler, getHeader,
// setHeader, getRequestURL) — on les fournit via vi.mock('h3') afin de tester
// la logique pure sans démarrer un serveur Nitro complet.
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ------------------------------------------------------------------

// Stocker les valeurs injectées par les helpers h3 pour inspection
const mockResponseHeaders: Record<string, string> = {};
let mockRequestId: string | null = null;
let mockUrl = '/api/test';

vi.mock('h3', () => ({
  defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  getHeader: (_event: unknown, name: string) =>
    name === 'x-request-id' ? mockRequestId : null,
  setHeader: (_event: unknown, name: string, value: string) => {
    mockResponseHeaders[name] = value;
  },
  getRequestURL: (_event: unknown) => new URL(`http://localhost${mockUrl}`),
}));

// Mock du logger pour capturer les appels
const mockLoggerInfo = vi.fn();
const mockChildInfo = vi.fn();

vi.mock('~~/server/utils/logger', () => ({
  childLogger: (_context: Record<string, unknown>) => ({
    info: mockChildInfo,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: mockLoggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

// --- Helpers ----------------------------------------------------------------

/** Construit un event H3 minimal suffisant pour le middleware. */
function buildEvent(overrides?: { requestId?: string; url?: string }) {
  mockRequestId = overrides?.requestId ?? null;
  mockUrl = overrides?.url ?? '/api/test';

  const nodeRes = new EventEmitter() as EventEmitter & {
    statusCode: number;
  };
  nodeRes.statusCode = 200;

  return {
    method: 'GET',
    context: {} as Record<string, unknown>,
    node: { res: nodeRes },
  };
}

// --- Tests ------------------------------------------------------------------

describe('server/middleware/01.request-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockResponseHeaders).forEach((k) => {
      delete mockResponseHeaders[k];
    });
  });

  it('injecte x-request-id dans les headers de réponse', async () => {
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent();
    handler(event);

    expect(mockResponseHeaders['x-request-id']).toBeDefined();
    expect(typeof mockResponseHeaders['x-request-id']).toBe('string');
    expect(mockResponseHeaders['x-request-id']!.length).toBeGreaterThan(0);
  });

  it('définit event.context.logger après exécution', async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent();
    handler(event);

    expect(event.context['logger']).toBeDefined();
    expect(typeof event.context['logger']).toBe('object');
  });

  it('définit event.context.traceId après exécution', async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent();
    handler(event);

    expect(event.context['traceId']).toBeDefined();
    expect(typeof event.context['traceId']).toBe('string');
    expect((event.context['traceId'] as string).length).toBeGreaterThan(0);
  });

  it("réutilise l'en-tête x-request-id fourni par le client", async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent({ requestId: 'abc123-custom-trace-id' });
    handler(event);

    expect(event.context['traceId']).toBe('abc123-custom-trace-id');
    expect(mockResponseHeaders['x-request-id']).toBe('abc123-custom-trace-id');
  });

  it('génère un traceId unique quand x-request-id est absent', async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event1 = buildEvent();
    handler(event1);
    const event2 = buildEvent();
    handler(event2);

    const id1 = event1.context['traceId'] as string;
    const id2 = event2.context['traceId'] as string;
    expect(id1).not.toBe(id2);
  });

  it("logue 'req' à l'entrée avec method et url", async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent({ url: '/api/health' });
    handler(event);

    expect(mockChildInfo).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/health' }),
      'req',
    );
  });

  it("logue 'res' à la fin avec status et durationMs", async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    const event = buildEvent({ url: '/api/health' });
    handler(event);

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

  it('tronque les x-request-id plus longs que 36 caractères', async () => {
    vi.resetModules();
    const handler = await import(
      '~~/server/middleware/01.request-logger'
    ).then((m) => m.default);

    // UUID v4 = 36 chars. On envoie un id trop long (ex. propagé par un CDN maladroit).
    const longId = 'a'.repeat(100);
    const event = buildEvent({ requestId: longId });
    handler(event);

    expect((event.context['traceId'] as string).length).toBe(36);
    expect(mockResponseHeaders['x-request-id']!.length).toBe(36);
  });
});
