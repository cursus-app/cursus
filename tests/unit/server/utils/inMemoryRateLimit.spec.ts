// @vitest-environment node
//
// Tests unitaires pour checkRateLimitBulk — rate limit batch invitations.
// Cf. ST-04.2 — TT-04.2.5.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// On doit importer après avoir mocked createError (h3)
vi.mock('h3', () => ({
  createError: vi.fn((opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number };
    err.statusCode = opts.statusCode;
    return err;
  }),
}));

// Import après le mock
const { checkRateLimitBulk } = await import('~~/server/utils/inMemoryRateLimit');

describe('checkRateLimitBulk', () => {
  const KEY = 'test:bulk:user-123';
  const MAX = 50;
  const WINDOW_MS = 60 * 60 * 1_000; // 1h

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('autorise un batch dans la limite', () => {
    expect(() => checkRateLimitBulk(`${KEY}-a`, 10, MAX, WINDOW_MS)).not.toThrow();
  });

  it('autorise exactement le quota max en une fois', () => {
    expect(() => checkRateLimitBulk(`${KEY}-b`, 50, MAX, WINDOW_MS)).not.toThrow();
  });

  it('rejette si le batch dépasse le quota', () => {
    expect(() => checkRateLimitBulk(`${KEY}-c`, 51, MAX, WINDOW_MS)).toThrow();
  });

  it('rejette le 51ème email en batch cumulé (2 appels)', () => {
    const key = `${KEY}-d`;
    // Premier batch de 45
    expect(() => checkRateLimitBulk(key, 45, MAX, WINDOW_MS)).not.toThrow();
    // Second batch de 6 → total 51 > 50
    expect(() => checkRateLimitBulk(key, 6, MAX, WINDOW_MS)).toThrow();
  });

  it('autorise un nouveau batch après expiration de la fenêtre', () => {
    const key = `${KEY}-e`;
    checkRateLimitBulk(key, 50, MAX, WINDOW_MS);
    // Avance le temps d'1h + 1ms
    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(() => checkRateLimitBulk(key, 50, MAX, WINDOW_MS)).not.toThrow();
  });

  it('retourne 429 avec un statusCode correct', () => {
    const key = `${KEY}-f`;
    let thrown: unknown;
    try {
      checkRateLimitBulk(key, 51, MAX, WINDOW_MS);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect((thrown as Error & { statusCode: number }).statusCode).toBe(429);
  });

  it('permet 50 exact après avoir déjà utilisé 0', () => {
    const key = `${KEY}-g`;
    expect(() => checkRateLimitBulk(key, 1, MAX, WINDOW_MS)).not.toThrow();
    expect(() => checkRateLimitBulk(key, 49, MAX, WINDOW_MS)).not.toThrow();
    // total = 50 exactement
    expect(() => checkRateLimitBulk(key, 1, MAX, WINDOW_MS)).toThrow();
  });
});
