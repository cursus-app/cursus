// @vitest-environment node
/**
 * Tests unitaires pour PUT /api/me/preferences/theme (ST-18.5).
 *
 * On mock toutes les dependances (Prisma, Supabase, logger, hash) et on stub
 * les globals Nitro (defineEventHandler, createError, readValidatedBody).
 *
 * Le schema Zod est teste de facon independante (section "themeSchema") pour
 * couvrir tous les cas de validation sans passer par le handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// ─── Mocks (prefixe "mock" pour compatibilite avec le hoisting Vitest) ─────────

const mockPrismaUserUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: {
      update: mockPrismaUserUpdate,
    },
  },
}));

const mockLoggerInfo = vi.fn();
vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
  },
}));

const mockHashId = vi.fn().mockReturnValue('abc123hashed');
vi.mock('~~/server/utils/hash', () => ({
  hashId: mockHashId,
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

// ─── H3 / Nitro globals ────────────────────────────────────────────────────────

const mockCreateError = vi.fn((opts: { statusCode: number; message?: string }) => {
  const err = new Error(opts.message ?? 'Error');
  // @ts-expect-error — proprietes H3Error ajoutees manuellement pour les tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Import dynamique (apres tous les mocks) ──────────────────────────────────

const importHandler = () => import('~~/server/api/me/preferences/theme.put');

// ─── Tests : handler API ──────────────────────────────────────────────────────

describe('PUT /api/me/preferences/theme — authentification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockPrismaUserUpdate.mockResolvedValue({});
    mockHashId.mockReturnValue('abc123hashed');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when not authenticated (serverSupabaseUser returns null)', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('PUT /api/me/preferences/theme — happy paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockPrismaUserUpdate.mockResolvedValue({});
    mockHashId.mockReturnValue('abc123hashed');
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-real-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { theme: "dark" } when body is { theme: "dark" }', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'dark' });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ theme: 'dark' });
  });

  it('returns { theme: "light" } when body is { theme: "light" }', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'light' });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ theme: 'light' });
  });

  it('returns { theme: "system" } when body is { theme: "system" }', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'system' });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ theme: 'system' });
  });
});

describe('PUT /api/me/preferences/theme — Prisma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockPrismaUserUpdate.mockResolvedValue({});
    mockHashId.mockReturnValue('abc123hashed');
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-real-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls prisma.user.update with correct where: { id } and data: { theme } for dark', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'dark' });

    const { default: handler } = await importHandler();
    await handler({});

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-real-id' },
      data: { theme: 'dark' },
    });
  });

  it('calls prisma.user.update with data: { theme: "light" } for light', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'light' });

    const { default: handler } = await importHandler();
    await handler({});

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-real-id' },
      data: { theme: 'light' },
    });
  });

  it('calls prisma.user.update exactly once per request', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'system' });

    const { default: handler } = await importHandler();
    await handler({});

    expect(mockPrismaUserUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/me/preferences/theme — logging et securite PII', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockPrismaUserUpdate.mockResolvedValue({});
    mockHashId.mockReturnValue('abc123hashed');
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-real-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls logger.info with userIdHash (hashed) and theme', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'dark' });

    const { default: handler } = await importHandler();
    await handler({});

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      { userIdHash: 'abc123hashed', theme: 'dark' },
      'user.preference.theme_changed',
    );
  });

  it('does NOT log raw userId — only hashed value appears in log payload', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'dark' });

    const { default: handler } = await importHandler();
    await handler({});

    const logCall = mockLoggerInfo.mock.calls[0];
    const logPayload = JSON.stringify(logCall);
    // Raw ID must not appear; only the hashed version
    expect(logPayload).not.toContain('user-real-id');
    expect(logPayload).toContain('abc123hashed');
  });

  it('calls hashId with the supabase user id', async () => {
    mockReadValidatedBody.mockResolvedValue({ theme: 'light' });

    const { default: handler } = await importHandler();
    await handler({});

    expect(mockHashId).toHaveBeenCalledWith('user-real-id');
  });
});

describe('PUT /api/me/preferences/theme — erreurs body invalide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-real-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates error when readValidatedBody throws (e.g. invalid theme)', async () => {
    mockReadValidatedBody.mockRejectedValueOnce(
      new Error('[zod] Validation failed: invalid enum value'),
    );

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toThrow();
  });

  it('does not call prisma.user.update when body validation fails', async () => {
    mockReadValidatedBody.mockRejectedValueOnce(new Error('Validation error'));

    const { default: handler } = await importHandler();
    try {
      await handler({});
    } catch {
      // expected
    }

    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });
});

// ─── Tests : schema Zod independant ──────────────────────────────────────────
// On teste le schema directement pour couvrir toutes les valeurs sans passer
// par le handler — plus rapide et plus lisible que de simuler readValidatedBody.

describe('themeSchema — validation Zod', () => {
  // Reproduit le schema du handler pour tests independants
  const themeSchema = z.object({ theme: z.enum(['light', 'dark', 'system']) });

  it('accepts { theme: "light" }', () => {
    expect(() => themeSchema.parse({ theme: 'light' })).not.toThrow();
    expect(themeSchema.parse({ theme: 'light' })).toEqual({ theme: 'light' });
  });

  it('accepts { theme: "dark" }', () => {
    expect(() => themeSchema.parse({ theme: 'dark' })).not.toThrow();
    expect(themeSchema.parse({ theme: 'dark' })).toEqual({ theme: 'dark' });
  });

  it('accepts { theme: "system" }', () => {
    expect(() => themeSchema.parse({ theme: 'system' })).not.toThrow();
    expect(themeSchema.parse({ theme: 'system' })).toEqual({ theme: 'system' });
  });

  it('rejects { theme: "purple" } with ZodError', () => {
    expect(() => themeSchema.parse({ theme: 'purple' })).toThrow(z.ZodError);
  });

  it('rejects { theme: "auto" } (not in enum) with ZodError', () => {
    expect(() => themeSchema.parse({ theme: 'auto' })).toThrow(z.ZodError);
  });

  it('rejects {} (missing theme) with ZodError', () => {
    expect(() => themeSchema.parse({})).toThrow(z.ZodError);
  });

  it('rejects { theme: null } with ZodError', () => {
    expect(() => themeSchema.parse({ theme: null })).toThrow(z.ZodError);
  });

  it('rejects { theme: 42 } (wrong type) with ZodError', () => {
    expect(() => themeSchema.parse({ theme: 42 })).toThrow(z.ZodError);
  });

  it('rejects { theme: "" } (empty string) with ZodError', () => {
    expect(() => themeSchema.parse({ theme: '' })).toThrow(z.ZodError);
  });
});
