// @vitest-environment node
//
// Tests unitaires pour GET /api/me/submissions/:submissionId (ST-05.2)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaSubmission = { findUnique: vi.fn() };

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
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

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed-${id}`,
}));

const mockCreateError = vi.fn(
  (opts: { statusCode: number; message?: string }) => {
    const err = new Error(opts.message ?? String(opts.statusCode));
    // @ts-expect-error — propriétés H3Error
    err.statusCode = opts.statusCode;
    return err;
  },
);
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParams = vi.fn();
vi.stubGlobal('getRouterParams', mockGetRouterParams);

// ─── Fixtures ─────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const SUBMISSION_ID = '550e8400-e29b-41d4-a716-446655440003';
const HARNESS_RUN_ID = '550e8400-e29b-41d4-a716-446655440004';

const now = new Date();

const defaultSubmission = {
  id: SUBMISSION_ID,
  userId: USER_ID,
  moduleId: '550e8400-e29b-41d4-a716-446655440002',
  repoUrl: 'https://github.com/johndoe/mon-projet',
  deployUrl: null,
  status: 'RUNNING',
  attemptNumber: 1,
  submittedAt: now,
  validatedAt: null,
  harnessRuns: [
    {
      id: HARNESS_RUN_ID,
      status: 'QUEUED',
      startedAt: null,
      finishedAt: null,
      checksJson: null,
      errorMessage: null,
      createdAt: now,
    },
  ],
};

const importHandler = () =>
  import('~~/server/api/me/submissions/[submissionId].get');

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/me/submissions/:submissionId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockGetRouterParams.mockReturnValue({ submissionId: SUBMISSION_ID });
    mockPrismaSubmission.findUnique.mockResolvedValue(defaultSubmission);
  });

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it("retourne 400 si submissionId n'est pas un UUID valide", async () => {
    mockGetRouterParams.mockReturnValue({ submissionId: 'not-a-uuid' });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('retourne 404 si la soumission est introuvable', async () => {
    mockPrismaSubmission.findUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it("retourne 403 si la soumission appartient à un autre utilisateur", async () => {
    mockPrismaSubmission.findUnique.mockResolvedValue({
      ...defaultSubmission,
      userId: 'autre-user-id',
    });
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne la soumission avec le dernier HarnessRun', async () => {
    const { default: handler } = await importHandler();
    const result = (await handler({})) as {
      id: string;
      latestHarnessRun: { id: string; status: string } | null;
    };

    expect(result.id).toBe(SUBMISSION_ID);
    expect(result.latestHarnessRun).not.toBeNull();
    expect(result.latestHarnessRun?.id).toBe(HARNESS_RUN_ID);
    expect(result.latestHarnessRun?.status).toBe('QUEUED');
  });

  it('retourne latestHarnessRun null si aucun run', async () => {
    mockPrismaSubmission.findUnique.mockResolvedValue({
      ...defaultSubmission,
      harnessRuns: [],
    });
    const { default: handler } = await importHandler();
    const result = (await handler({})) as { latestHarnessRun: null };
    expect(result.latestHarnessRun).toBeNull();
  });

  it('retourne les dates au format ISO string', async () => {
    const { default: handler } = await importHandler();
    const result = (await handler({})) as { submittedAt: string; validatedAt: null };

    expect(typeof result.submittedAt).toBe('string');
    expect(result.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.validatedAt).toBeNull();
  });
});
