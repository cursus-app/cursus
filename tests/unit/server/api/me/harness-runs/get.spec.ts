// @vitest-environment node
//
// Tests unitaires pour GET /api/me/harness-runs/:id (ST-06.4 fallback polling)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaHarnessRun = { findUnique: vi.fn() };

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    harnessRun: mockPrismaHarnessRun,
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

const mockCreateError = vi.fn((opts: { statusCode: number; message?: string }) => {
  const err = new Error(opts.message ?? String(opts.statusCode));
  // @ts-expect-error — propriétés H3Error
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParams = vi.fn();
vi.stubGlobal('getRouterParams', mockGetRouterParams);

// ─── Fixtures ─────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440099';
const RUN_ID = '550e8400-e29b-41d4-a716-446655440004';

const CHECKS_JSON = {
  checks: [
    { check_id: 'repo_exists_public', status: 'success', message: 'Repo trouvé et public' },
  ],
};

const defaultRun = {
  id: RUN_ID,
  status: 'SUCCESS',
  checksJson: CHECKS_JSON,
  submission: { userId: USER_ID },
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/me/harness-runs/:id', () => {
  let handler: (...args: unknown[]) => unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import(
      '~~/server/api/me/harness-runs/[id].get'
    );
    handler = mod.default as (...args: unknown[]) => unknown;
  });

  it('retourne le harness run quand le user en est propriétaire', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockGetRouterParams.mockReturnValue({ id: RUN_ID });
    mockPrismaHarnessRun.findUnique.mockResolvedValue(defaultRun);

    const result = await handler({});

    expect(result).toEqual({
      harnessRun: {
        id: RUN_ID,
        status: 'SUCCESS',
        checksJson: CHECKS_JSON,
      },
    });
  });

  it("retourne { harnessRun: null } si le run n'existe pas", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockGetRouterParams.mockReturnValue({ id: RUN_ID });
    mockPrismaHarnessRun.findUnique.mockResolvedValue(null);

    const result = await handler({});

    expect(result).toEqual({ harnessRun: null });
  });

  it('lève 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    mockGetRouterParams.mockReturnValue({ id: RUN_ID });

    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève 403 si le run appartient à un autre user (RLS)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER_USER_ID });
    mockGetRouterParams.mockReturnValue({ id: RUN_ID });
    mockPrismaHarnessRun.findUnique.mockResolvedValue(defaultRun);

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lève 400 si le run ID n'est pas un UUID valide", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockGetRouterParams.mockReturnValue({ id: 'not-a-uuid' });

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
  });
});
