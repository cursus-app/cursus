// @vitest-environment node
//
// Tests unitaires pour GET /api/me/submissions (ST-05.4)
// Vérifie : auth guard, filtrage par statut, pagination, isolation par userId.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaUser = { findUnique: vi.fn() };
const mockPrismaSubmission = {
  count: vi.fn(),
  findMany: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    submission: mockPrismaSubmission,
  },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCreateError = vi.fn((opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage);
  // @ts-expect-error — H3Error properties added for testing
  err.statusCode = opts.statusCode;
  // @ts-expect-error — H3Error properties added for testing
  err.statusMessage = opts.statusMessage;
  return err;
});

vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

// getQuery stub — returns query from event
const mockGetQuery = vi.fn();
vi.stubGlobal('getQuery', mockGetQuery);

// ---- Import handler ----
const importHandler = () => import('~~/server/api/me/submissions.get');

// ---- Helpers ----
function makeEvent() {
  return { node: { req: {}, res: {} } };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    status: 'PENDING',
    repoUrl: 'https://github.com/user/repo',
    deployUrl: null,
    attemptNumber: 1,
    submittedAt: new Date('2026-06-01T10:00:00Z'),
    validatedAt: null,
    module: { id: 'mod-1', title: 'Introduction à Git', week: 1 },
    harnessRuns: [],
    ...overrides,
  };
}

// ---- Tests ----

describe('GET /api/me/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuery.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne 401 si l'utilisateur n'est pas authentifié (pas de session Supabase)", async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("retourne 401 si l'utilisateur n'existe pas en DB", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne les soumissions triées par date décroissante (mock Prisma)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockPrismaSubmission.count.mockResolvedValue(2);
    mockPrismaSubmission.findMany.mockResolvedValue([
      makeSubmission({ id: 'sub-2', submittedAt: new Date('2026-06-10T10:00:00Z') }),
      makeSubmission({ id: 'sub-1', submittedAt: new Date('2026-06-01T10:00:00Z') }),
    ]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.data).toHaveLength(2);
    // Les IDs doivent être dans l'ordre retourné par Prisma (sub-2 avant sub-1)
    expect(result.data[0]).toMatchObject({ id: 'sub-2' });
    expect(result.data[1]).toMatchObject({ id: 'sub-1' });
    // Vérifie que Prisma est appelé avec orderBy: { submittedAt: 'desc' }
    expect(mockPrismaSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { submittedAt: 'desc' },
      }),
    );
  });

  it('filtre par statut VALIDATED correctement', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockGetQuery.mockReturnValue({ status: 'VALIDATED', page: '1' });
    mockPrismaSubmission.count.mockResolvedValue(1);
    mockPrismaSubmission.findMany.mockResolvedValue([
      makeSubmission({ status: 'VALIDATED', validatedAt: new Date('2026-06-05T10:00:00Z') }),
    ]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ status: 'VALIDATED' });

    // Le where doit inclure le filtre de statut
    expect(mockPrismaSubmission.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'VALIDATED' }),
      }),
    );
  });

  it("ne filtre PAS par statut si status='all' (where sans clé status)", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockGetQuery.mockReturnValue({ status: 'all' });
    mockPrismaSubmission.count.mockResolvedValue(0);
    mockPrismaSubmission.findMany.mockResolvedValue([]);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Le where ne doit PAS contenir la clé status (seulement userId)
    expect(mockPrismaSubmission.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: expect.anything() }),
      }),
    );
  });

  it('calcule la pagination correctement (page 2, 20 items/page)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockGetQuery.mockReturnValue({ page: '2' });
    mockPrismaSubmission.count.mockResolvedValue(35);
    mockPrismaSubmission.findMany.mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => makeSubmission({ id: `sub-${i}` })),
    );

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.meta).toMatchObject({
      total: 35,
      page: 2,
      perPage: 20,
      totalPages: 2,
    });
    // Skip doit être (2-1) * 20 = 20
    expect(mockPrismaSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('retourne le latestHarnessRun si présent', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockPrismaSubmission.count.mockResolvedValue(1);
    mockPrismaSubmission.findMany.mockResolvedValue([
      makeSubmission({
        harnessRuns: [
          {
            id: 'run-1',
            status: 'SUCCESS',
            githubWorkflowUrl: 'https://github.com/actions/run/1',
            checksJson: [{ name: 'readme_present', passed: true }],
            startedAt: new Date('2026-06-01T10:01:00Z'),
            finishedAt: new Date('2026-06-01T10:02:00Z'),
          },
        ],
      }),
    ]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.data[0]).toMatchObject({
      latestHarnessRun: {
        id: 'run-1',
        status: 'SUCCESS',
        githubWorkflowUrl: 'https://github.com/actions/run/1',
      },
    });
  });

  it("retourne latestHarnessRun null si aucun run n'existe", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockPrismaSubmission.count.mockResolvedValue(1);
    mockPrismaSubmission.findMany.mockResolvedValue([makeSubmission({ harnessRuns: [] })]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.data[0]).toMatchObject({ latestHarnessRun: null });
  });

  it('retourne 400 pour un statut invalide', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });
    mockGetQuery.mockReturnValue({ status: 'INVALID_STATUS' });

    const { default: handler } = await importHandler();
    await expect(() => handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("utilise userId de la session — pas un paramètre de requête (isolation)", async () => {
    const sessionUserId = 'user-session';
    mockServerSupabaseUser.mockResolvedValue({ id: sessionUserId });
    mockPrismaUser.findUnique.mockResolvedValue({ id: sessionUserId });
    mockGetQuery.mockReturnValue({ userId: 'other-user' }); // paramètre injecté malicieux
    mockPrismaSubmission.count.mockResolvedValue(0);
    mockPrismaSubmission.findMany.mockResolvedValue([]);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Le where doit utiliser l'ID de la session, pas le paramètre externe
    expect(mockPrismaSubmission.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: sessionUserId }),
      }),
    );
  });
});
