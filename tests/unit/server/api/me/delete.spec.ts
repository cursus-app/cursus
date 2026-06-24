// @vitest-environment node
//
// Tests unitaires pour POST /api/me/delete (ST-15.2)
// On mock Prisma, Supabase et Inngest — pas de vraie DB nécessaire.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
  },
}));

vi.mock('~~/server/utils/inngest', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockCreateError = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage);
  // @ts-expect-error — Error n'a pas statusCode/statusMessage natifs, propriétés H3Error ajoutées pour les tests
  err.statusCode = opts.statusCode;
  // @ts-expect-error — Error n'a pas statusCode/statusMessage natifs, propriétés H3Error ajoutées pour les tests
  err.statusMessage = opts.statusMessage;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

// Réinitialiser le module entre tests pour éviter la persistance du Map de rate limit
const importHandler = () => import('~~/server/api/me/delete.post');

// ---- Tests ----
describe('POST /api/me/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 400 si la confirmation est incorrecte', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440010';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'mauvaise phrase' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: userId, accountStatus: 'ACTIVE' });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('retourne 400 si le body est vide', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440011';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({});

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('retourne { queued: true } si authentifié + confirmation correcte + compte ACTIVE', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440012';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: userId, accountStatus: 'ACTIVE' });
    mockPrismaUser.update.mockResolvedValue({});

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({
      queued: true,
      message: expect.stringContaining('7 jours'),
    });
  });

  it('retourne 409 si le compte est déjà PENDING_DELETION', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440013';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });
    mockPrismaUser.findUnique.mockResolvedValue({
      id: userId,
      accountStatus: 'PENDING_DELETION',
    });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retourne 403 si le compte est SUSPENDED (legal hold)', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440014';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });
    mockPrismaUser.findUnique.mockResolvedValue({
      id: userId,
      accountStatus: 'SUSPENDED',
    });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it("retourne 404 si l'utilisateur n'existe pas en DB", async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440015';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 429 si deux tentatives rapprochées (rate limit)', async () => {
    // Dans ce test on simule 2 appels successifs avec le même userId.
    // Le Map de rate limit est réinitialisé par vi.resetModules() donc on
    // teste en faisant deux appels dans la même instance du module.
    const userId = '550e8400-e29b-41d4-a716-446655440016';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockReadBody.mockResolvedValue({ confirmation: 'SUPPRIMER MON COMPTE' });
    // Premier appel réussit
    mockPrismaUser.findUnique.mockResolvedValue({ id: userId, accountStatus: 'ACTIVE' });
    mockPrismaUser.update.mockResolvedValue({});

    const { default: handler } = await importHandler();
    // Premier appel OK
    await handler({});

    // Deuxième appel immédiat → 429
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 429 });
  });
});
