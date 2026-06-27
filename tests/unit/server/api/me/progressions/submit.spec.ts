// @vitest-environment node
//
// Tests unitaires pour POST /api/me/progressions/:progressionId/submit (ST-05.2)
// On mock Prisma, Supabase et Inngest — pas de vraie DB nécessaire.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaUser = { findUnique: vi.fn() };
const mockPrismaProgression = { findUnique: vi.fn() };
const mockPrismaSubmission = { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() };
const mockPrismaHarnessRun = { create: vi.fn() };
const mockPrismaAlert = { create: vi.fn() };
const mockPrismaProgressionUpdate = vi.fn();
const mockPrismaTransaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    progression: {
      findUnique: mockPrismaProgression.findUnique,
      update: mockPrismaProgressionUpdate,
    },
    submission: mockPrismaSubmission,
    harnessRun: mockPrismaHarnessRun,
    alert: mockPrismaAlert,
    $transaction: mockPrismaTransaction,
  },
}));

const mockInngestSend = vi.fn().mockResolvedValue(undefined);
vi.mock('~~/server/utils/inngest', () => ({
  inngest: { send: mockInngestSend },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed-${id}`,
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

const mockCreateError = vi.fn((opts: { statusCode: number; message?: string; data?: unknown }) => {
  const err = new Error(opts.message ?? String(opts.statusCode));
  // @ts-expect-error — propriétés H3Error ajoutées pour les tests
  err.statusCode = opts.statusCode;
  // @ts-expect-error — propriétés H3Error ajoutées pour les tests
  err.message = opts.message;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

const mockGetRouterParams = vi.fn();
vi.stubGlobal('getRouterParams', mockGetRouterParams);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROGRESSION_ID = 'prog-001';
const MODULE_ID = '550e8400-e29b-41d4-a716-446655440002';
const SUBMISSION_ID = '550e8400-e29b-41d4-a716-446655440003';
const HARNESS_RUN_ID = '550e8400-e29b-41d4-a716-446655440004';

const defaultUser = {
  id: USER_ID,
  githubHandle: 'johndoe',
};

const defaultProgression = {
  id: PROGRESSION_ID,
  userId: USER_ID,
  status: 'EN_COURS',
  cohortModule: {
    module: {
      id: MODULE_ID,
      title: 'Module Test',
      deliverableSpecJson: { checks: [{ id: 'lint', name: 'Lint' }] },
    },
  },
};

const validBody = {
  repoUrl: 'https://github.com/johndoe/mon-projet',
  deployUrl: '',
};

const importHandler = () => import('~~/server/api/me/progressions/[progressionId]/submit.post');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockGetRouterParams.mockReturnValue({ progressionId: PROGRESSION_ID });
    mockReadValidatedBody.mockResolvedValue({
      success: true,
      data: validBody,
    });
    mockPrismaUser.findUnique.mockResolvedValue(defaultUser);
    mockPrismaProgression.findUnique.mockResolvedValue(defaultProgression);
    mockPrismaSubmission.findFirst.mockResolvedValue(null); // pas de soumission en cours
    mockPrismaSubmission.count.mockResolvedValue(0); // pas de spam
    mockPrismaSubmission.create.mockResolvedValue(null);
    mockPrismaHarnessRun.create.mockResolvedValue(null);
    mockPrismaAlert.create.mockResolvedValue(null);
    mockPrismaProgressionUpdate.mockResolvedValue(null);
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: { create: vi.fn().mockResolvedValue({ id: SUBMISSION_ID }) },
        harnessRun: { create: vi.fn().mockResolvedValue({ id: HARNESS_RUN_ID }) },
      };
      return fn(tx);
    });
  });

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 400 si progressionId est absent', async () => {
    mockGetRouterParams.mockReturnValue({});
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('retourne 400 si body invalide', async () => {
    mockReadValidatedBody.mockResolvedValue({
      success: false,
      error: {
        flatten: () => ({ fieldErrors: { repoUrl: ['invalid'] } }),
      },
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("retourne 403 si le stagiaire n'a pas de githubHandle", async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ id: USER_ID, githubHandle: null });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it("retourne 403 si le repo n'appartient pas au stagiaire", async () => {
    mockReadValidatedBody.mockResolvedValue({
      success: true,
      data: {
        repoUrl: 'https://github.com/autreuser/mon-projet',
        deployUrl: '',
      },
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne 404 si la progression est introuvable', async () => {
    mockPrismaProgression.findUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 403 si la progression appartient à un autre utilisateur', async () => {
    mockPrismaProgression.findUnique.mockResolvedValue({
      ...defaultProgression,
      userId: 'autre-user-id',
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne 409 si la progression est déjà validée (VALIDE)', async () => {
    mockPrismaProgression.findUnique.mockResolvedValue({
      ...defaultProgression,
      status: 'VALIDE',
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retourne 409 si la progression est VALIDE_OVERRIDE', async () => {
    mockPrismaProgression.findUnique.mockResolvedValue({
      ...defaultProgression,
      status: 'VALIDE_OVERRIDE',
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retourne 409 si une soumission est déjà en cours (RUNNING)', async () => {
    mockPrismaSubmission.findFirst.mockResolvedValue({ id: 'existing-submission' });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 409 });
  });

  it("retourne 429 si le stagiaire a atteint la limite d'échecs (10)", async () => {
    mockPrismaSubmission.count.mockResolvedValue(10);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 429 });
  });

  it('bloque la 11ème soumission échouée (anti-spam)', async () => {
    mockPrismaSubmission.count.mockResolvedValue(11);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 429 });
  });

  it('accepte exactement 9 soumissions échouées (sous la limite)', async () => {
    mockPrismaSubmission.count.mockResolvedValue(9);
    const { default: handler } = await importHandler();
    const result = (await handler({})) as { submissionId: string; harnessRunId: string };
    expect(result.submissionId).toBe(SUBMISSION_ID);
    expect(result.harnessRunId).toBe(HARNESS_RUN_ID);
  });

  it('crée la soumission, le HarnessRun et dispatche Inngest en cas de succès', async () => {
    const { default: handler } = await importHandler();
    const result = (await handler({})) as { submissionId: string; harnessRunId: string };

    expect(result.submissionId).toBe(SUBMISSION_ID);
    expect(result.harnessRunId).toBe(HARNESS_RUN_ID);
    expect(mockInngestSend).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'cursus/harness.trigger',
        data: expect.objectContaining({
          submissionId: SUBMISSION_ID,
          repoUrl: validBody.repoUrl,
        }),
      }),
    );
  });

  it("dispatche l'événement Inngest avec le bon nom 'cursus/harness.trigger'", async () => {
    const { default: handler } = await importHandler();
    await handler({});
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cursus/harness.trigger' }),
    );
  });

  it('transition la progression vers SOUMIS si elle est EN_COURS', async () => {
    const { default: handler } = await importHandler();
    await handler({});
    expect(mockPrismaProgressionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROGRESSION_ID },
        data: expect.objectContaining({ status: 'SOUMIS' }),
      }),
    );
  });

  it("ne transition pas la progression si elle n'est pas EN_COURS", async () => {
    mockPrismaProgression.findUnique.mockResolvedValue({
      ...defaultProgression,
      status: 'SOUMIS',
    });
    // Note: SOUMIS n'est pas bloquant — only VALIDE/VALIDE_OVERRIDE le sont
    // mais on vérifie que l'update n'est pas appelé pour SOUMIS
    const { default: handler } = await importHandler();
    await handler({});
    // Pour SOUMIS (pas EN_COURS), pas de transition
    expect(mockPrismaProgressionUpdate).not.toHaveBeenCalled();
  });
});
