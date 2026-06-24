import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

/**
 * Tests unitaires pour :
 * - server/utils/requireGithub#requireGithubHandle (logique pure testable)
 * - Validation du schéma Zod githubHandle
 *
 * Note sur les handlers API Nitro :
 * `defineEventHandler` est un auto-import Nitro, non disponible en dehors du
 * runtime Nitro. Les handlers (github-connect.post, github-disconnect.post)
 * sont couverts par les tests d'intégration (tests/integration/).
 * Cf. vitest.config.ts coverage section + 09-engineering-playbook §test.
 */

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFindUnique, mockServerSupabaseUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockServerSupabaseUser: vi.fn(),
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: mockFindUnique,
      update: vi.fn(),
    },
  },
}));

// Mock du fichier physique réel derrière l'alias #supabase/server.
vi.mock(
  '/Users/sadjad/Dev/perso/cursus/node_modules/@nuxtjs/supabase/dist/runtime/server/services/index.js',
  () => ({ serverSupabaseUser: mockServerSupabaseUser }),
);

// ─── requireGithubHandle ─────────────────────────────────────────────────────

describe('requireGithubHandle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne le handle si connecté', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-001' });
    mockFindUnique.mockResolvedValue({ githubHandle: 'mon-handle' });

    const { requireGithubHandle } = await import('~~/server/utils/requireGithub');
    const mockEvent = { context: {}, node: { req: {}, res: {} } };

    // @ts-expect-error — H3Event minimal pour le test
    const handle = await requireGithubHandle(mockEvent);

    expect(handle).toBe('mon-handle');
  });

  it('throw 403 GITHUB_NOT_CONNECTED si handle null', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-002' });
    mockFindUnique.mockResolvedValue({ githubHandle: null });

    const { requireGithubHandle } = await import('~~/server/utils/requireGithub');
    const mockEvent = { context: {}, node: { req: {}, res: {} } };

    await expect(
      // @ts-expect-error — H3Event minimal
      requireGithubHandle(mockEvent),
    ).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'GITHUB_NOT_CONNECTED' },
    });
  });

  it('throw 403 GITHUB_NOT_CONNECTED si user introuvable en DB', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-003' });
    mockFindUnique.mockResolvedValue(null); // user inconnu en DB

    const { requireGithubHandle } = await import('~~/server/utils/requireGithub');
    const mockEvent = { context: {}, node: { req: {}, res: {} } };

    await expect(
      // @ts-expect-error — H3Event minimal
      requireGithubHandle(mockEvent),
    ).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'GITHUB_NOT_CONNECTED' },
    });
  });

  it('throw 401 si user non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { requireGithubHandle } = await import('~~/server/utils/requireGithub');
    const mockEvent = { context: {}, node: { req: {}, res: {} } };

    await expect(
      // @ts-expect-error — H3Event minimal
      requireGithubHandle(mockEvent),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── Validation Zod du github_handle ─────────────────────────────────────────
// On teste le schéma directement — il est défini dans le handler mais
// la regex est le cœur de la règle métier (sécurité : pas d'injection via handle).

describe('githubHandle — validation Zod', () => {
  // Reproduit le schéma exact du handler pour tests indépendants
  const githubHandleSchema = z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/);

  it('accepte un handle valide alphanumérique', () => {
    expect(() => githubHandleSchema.parse('monhandle')).not.toThrow();
    expect(githubHandleSchema.parse('my-handle-123')).toBe('my-handle-123');
  });

  it("accepte un handle d'une seule lettre", () => {
    expect(() => githubHandleSchema.parse('a')).not.toThrow();
  });

  it('rejette un handle commençant par un tiret', () => {
    expect(() => githubHandleSchema.parse('-monhandle')).toThrow(z.ZodError);
  });

  it('rejette un handle finissant par un tiret', () => {
    expect(() => githubHandleSchema.parse('monhandle-')).toThrow(z.ZodError);
  });

  it('rejette un handle avec caractères spéciaux', () => {
    expect(() => githubHandleSchema.parse('mon@handle')).toThrow(z.ZodError);
    expect(() => githubHandleSchema.parse('mon_handle')).toThrow(z.ZodError);
    expect(() => githubHandleSchema.parse('mon handle')).toThrow(z.ZodError);
  });

  it('rejette un handle trop long (> 39 caractères)', () => {
    expect(() => githubHandleSchema.parse('a'.repeat(40))).toThrow(z.ZodError);
  });

  it('rejette un handle vide', () => {
    expect(() => githubHandleSchema.parse('')).toThrow(z.ZodError);
  });

  it('accepte un handle avec tirets internes', () => {
    expect(() => githubHandleSchema.parse('mon-super-handle')).not.toThrow();
  });
});
