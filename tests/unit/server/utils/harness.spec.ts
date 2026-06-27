// @vitest-environment node
//
// Tests unitaires — server/utils/harness.ts (ST-06.1)
// Couvre : triggerHarnessRun — rate limit, DB lookup, Inngest dispatch.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCheckRateLimit = vi.fn();
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

const mockSubmissionFindUnique = vi.fn();
const mockHarnessRunCreate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    submission: { findUnique: mockSubmissionFindUnique },
    harnessRun: { create: mockHarnessRunCreate },
  },
}));

const mockInngestSend = vi.fn();
vi.mock('~~/server/inngest/client', () => ({
  inngest: { send: mockInngestSend },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Stub H3 globals
const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);

// ─── Import après les mocks ───────────────────────────────────────────────────
// Lazy import pour respecter l'ordre de hoisting des mocks
const getModule = async () => {
  const mod = await import('~~/server/utils/harness');
  return mod;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('triggerHarnessRun', () => {
  const baseOpts = {
    submissionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    repoUrl: 'https://github.com/user/repo',
    criteriaJson: { checks: ['repo_exists_public', 'tests_pass'] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmissionFindUnique.mockResolvedValue({ id: baseOpts.submissionId });
    mockHarnessRunCreate.mockResolvedValue({ id: 'run-123' });
    mockInngestSend.mockResolvedValue(undefined);
    mockCheckRateLimit.mockReturnValue(undefined); // pas de throw = OK
  });

  it('crée un HarnessRun QUEUED et retourne son ID', async () => {
    const { triggerHarnessRun } = await getModule();
    const result = await triggerHarnessRun(baseOpts);

    expect(result).toEqual({ harnessRunId: 'run-123' });
    expect(mockHarnessRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          submissionId: baseOpts.submissionId,
          status: 'QUEUED',
        },
      }),
    );
  });

  it('dispatche un événement Inngest "harness/trigger"', async () => {
    const { triggerHarnessRun } = await getModule();
    await triggerHarnessRun(baseOpts);

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'harness/trigger',
        data: expect.objectContaining({
          harnessRunId: 'run-123',
          submissionId: baseOpts.submissionId,
          repoUrl: baseOpts.repoUrl,
          criteriaJson: JSON.stringify(baseOpts.criteriaJson),
        }),
      }),
    );
  });

  it("inclut deployUrl dans l'événement Inngest si fourni", async () => {
    const { triggerHarnessRun } = await getModule();
    await triggerHarnessRun({ ...baseOpts, deployUrl: 'https://my-app.vercel.app' });

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deployUrl: 'https://my-app.vercel.app',
        }),
      }),
    );
  });

  it('vérifie le rate limit avec la bonne clé', async () => {
    const { triggerHarnessRun } = await getModule();
    await triggerHarnessRun(baseOpts);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      `harness:trigger:${baseOpts.submissionId}`,
      10,
      60 * 60 * 1_000,
    );
  });

  it("propage l'erreur 429 si le rate limit est dépassé", async () => {
    const { triggerHarnessRun } = await getModule();
    const rateLimitError = new Error('Trop de requêtes');
    // @ts-expect-error — H3Error properties not on standard Error, added for test simulation
    rateLimitError.statusCode = 429;
    mockCheckRateLimit.mockImplementation(() => {
      throw rateLimitError;
    });

    await expect(triggerHarnessRun(baseOpts)).rejects.toThrow('Trop de requêtes');
    expect(mockHarnessRunCreate).not.toHaveBeenCalled();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("lève une erreur 404 si la submission n'existe pas", async () => {
    const { triggerHarnessRun } = await getModule();
    mockSubmissionFindUnique.mockResolvedValue(null);

    // createError est stubGlobal — on vérifie le comportement de rejet
    // plutôt que l'appel au mock pour éviter les problèmes d'ordre d'exécution
    await expect(triggerHarnessRun(baseOpts)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockHarnessRunCreate).not.toHaveBeenCalled();
  });

  it("n'appelle pas Inngest si la création DB échoue", async () => {
    const { triggerHarnessRun } = await getModule();
    mockHarnessRunCreate.mockRejectedValue(new Error('DB error'));

    await expect(triggerHarnessRun(baseOpts)).rejects.toThrow('DB error');
    expect(mockInngestSend).not.toHaveBeenCalled();
  });
});
