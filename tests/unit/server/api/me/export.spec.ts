// @vitest-environment node
//
// Tests unitaires pour POST /api/me/export (ST-15.1)
// On mock Prisma, Supabase et Inngest — pas de vraie DB nécessaire.
//
// Pattern de test des handlers Nitro sans serveur HTTP :
//  1. Mocker les dépendances
//  2. Importer le handler
//  3. Construire un event H3 synthétique
//  4. Appeler defineEventHandler
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks (déclarés avant tous les imports du module testé) ----

const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
};
const mockPrismaExportJob = {
  create: vi.fn(),
};
const mockPrisma$transaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    gdprExportJob: mockPrismaExportJob,
    $transaction: mockPrisma$transaction,
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

// H3 createError est global dans Nitro — on le mock également
const mockCreateError = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage);
  // @ts-expect-error — Error n'a pas statusCode/statusMessage natifs, propriétés H3Error ajoutées pour les tests
  err.statusCode = opts.statusCode;
  // @ts-expect-error — Error n'a pas statusCode/statusMessage natifs, propriétés H3Error ajoutées pour les tests
  err.statusMessage = opts.statusMessage;
  return err;
});

vi.stubGlobal('createError', mockCreateError);

// defineEventHandler est un helper Nuxt — on l'expose globalement
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

// ---- Import du module sous test (APRÈS les mocks) ----
// On importe dynamiquement pour s'assurer que les mocks sont en place.
const importHandler = () => import('~~/server/api/me/export.post');

// ---- Helpers ----
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    node: { req: {}, res: {} },
    ...overrides,
  };
}

// ---- Tests ----
describe('POST /api/me/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset $transaction mock
    mockPrisma$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) =>
      Promise.all(ops),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    const event = makeEvent();

    await expect(() => handler(event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("retourne { queued: true } si l'utilisateur est authentifié et pas de cooldown", async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockPrismaUser.findUnique.mockResolvedValue({
      gdprExportRequestedAt: null,
      email: 'alice@example.com',
    });
    mockPrismaUser.update.mockResolvedValue({});
    mockPrismaExportJob.create.mockResolvedValue({ id: 'job-1' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({
      queued: true,
      message: expect.stringContaining('email'),
    });
  });

  it('retourne 429 si une demande a déjà été faite il y a moins de 7 jours', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440002';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });

    // Dernière demande il y a 3 jours (< 7 jours)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    mockPrismaUser.findUnique.mockResolvedValue({
      gdprExportRequestedAt: threeDaysAgo,
      email: 'alice@example.com',
    });

    const { default: handler } = await importHandler();
    const event = makeEvent();

    await expect(() => handler(event)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('accepte une nouvelle demande si le cooldown de 7 jours est écoulé', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440003';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });

    // Dernière demande il y a 8 jours (> 7 jours → ok)
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    mockPrismaUser.findUnique.mockResolvedValue({
      gdprExportRequestedAt: eightDaysAgo,
      email: 'alice@example.com',
    });
    mockPrismaUser.update.mockResolvedValue({});
    mockPrismaExportJob.create.mockResolvedValue({ id: 'job-2' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ queued: true });
  });

  it("retourne 404 si l'utilisateur n'existe pas en DB", async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440004';
    mockServerSupabaseUser.mockResolvedValue({ id: userId });
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler(makeEvent())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
