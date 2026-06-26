// @vitest-environment node
//
// Tests unitaires pour POST /api/cursus/:id/publish (ST-03.1).
// Handler importé une fois (pas de resetModules entre les tests).
// $transaction est mocké en mode callback (Prisma 7 interactive form).

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ─── Mocks hoistés ────────────────────────────────────────────────────────────

const {
  mockServerSupabaseUser,
  mockUserFindUnique,
  mockCursusFindUnique,
  mockPrismaTransaction,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockCursusFindUnique: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    $transaction: mockPrismaTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

// Nitro/H3 globals
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn().mockReturnValue('cursus-id-001');
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Handler (imported once) ──────────────────────────────────────────────────

type Handler = (event: unknown) => Promise<unknown>;
let handler: Handler;

beforeAll(async () => {
  const mod = await import('~~/server/api/cursus/[id]/publish.post');
  handler = mod.default as Handler;
});

// ─── Helpers & fixtures ───────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const OWNER = { id: 'owner-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const OTHER_USER = { id: 'other-uuid-999', globalRole: 'STAGIAIRE' };

const MODULE_ITEM = {
  id: 'mod-1',
  week: 1,
  title: 'Intro HTML',
  objectives: 'Learn HTML basics',
  resourcesJson: null,
  deliverableSpecJson: null,
  xpReward: 100,
};

const DRAFT_CURSUS = {
  id: 'cursus-id-001',
  title: 'Web Dev',
  slug: 'web-dev',
  domain: 'dev-web',
  level: 'BEGINNER',
  durationWeeks: 12,
  description: null,
  prerequisites: null,
  status: 'DRAFT',
  ownerId: OWNER.id,
  modules: [MODULE_ITEM],
  versions: [],
};

const DRAFT_CURSUS_NO_MODULES = { ...DRAFT_CURSUS, modules: [] };
const PUBLISHED_CURSUS = { ...DRAFT_CURSUS, status: 'PUBLISHED' };

/**
 * Builds a mock transaction client that records all calls.
 * The handler uses tx.cursus.updateMany, tx.cursusVersion.create, tx.cursus.findUniqueOrThrow.
 */
function makeTxProxy(
  opts: {
    updateManyResult?: { count: number };
    findResult?: Record<string, unknown>;
  } = {},
) {
  const mockUpdateMany = vi.fn().mockResolvedValue(opts.updateManyResult ?? { count: 1 });
  const mockCreate = vi.fn().mockResolvedValue({ id: 'ver-1', version: 1 });
  const mockFindUniqueOrThrow = vi.fn().mockResolvedValue(opts.findResult ?? PUBLISHED_CURSUS);

  return {
    tx: {
      cursus: {
        updateMany: mockUpdateMany,
        findUniqueOrThrow: mockFindUniqueOrThrow,
      },
      cursusVersion: { create: mockCreate },
    },
    mockUpdateMany,
    mockCreate,
    mockFindUniqueOrThrow,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/cursus/:id/publish — authentication & authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('cursus-id-001');
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when cursus does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(null);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when caller is not the owner and not ADMIN', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER_USER.id });
    mockUserFindUnique.mockResolvedValue(OTHER_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to publish a cursus they do not own', async () => {
    const admin = { id: 'admin-uuid', globalRole: 'ADMIN' };
    mockServerSupabaseUser.mockResolvedValue({ id: admin.id });
    mockUserFindUnique.mockResolvedValue(admin);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);

    const { tx } = makeTxProxy();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'PUBLISHED' });
  });
});

describe('POST /api/cursus/:id/publish — business rules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('cursus-id-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
  });

  it('throws 422 when cursus has 0 modules (checked before entering the transaction)', async () => {
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS_NO_MODULES);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
    // $transaction should NOT be called if modules check fails before it
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });

  it('throws 422 when cursus is not in DRAFT status (updateMany returns count=0)', async () => {
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);

    const { tx } = makeTxProxy({ updateManyResult: { count: 0 } });
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when cursus is ARCHIVED (updateMany WHERE status=DRAFT matches 0 rows)', async () => {
    mockCursusFindUnique.mockResolvedValue({ ...DRAFT_CURSUS, status: 'ARCHIVED' });

    // Even though cursus.modules.length > 0, status is ARCHIVED so updateMany would match 0 rows
    // But the handler doesn't check status before tx — only modules are checked
    // The ARCHIVED cursus still has modules, so it passes the module check.
    // Inside tx: updateMany with status='DRAFT' matches 0 rows → throw 422.
    const { tx } = makeTxProxy({ updateManyResult: { count: 0 } });
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('POST /api/cursus/:id/publish — happy path', () => {
  let txMock: ReturnType<typeof makeTxProxy>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('cursus-id-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);

    txMock = makeTxProxy();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txMock.tx));
  });

  it('returns the updated cursus with PUBLISHED status', async () => {
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'PUBLISHED', id: 'cursus-id-001' });
  });

  it('calls $transaction exactly once', async () => {
    await handler(makeEvent());
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });

  it('calls updateMany with WHERE id + status=DRAFT (optimistic lock)', async () => {
    await handler(makeEvent());

    expect(txMock.mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'cursus-id-001', status: 'DRAFT' }),
        data: { status: 'PUBLISHED' },
      }),
    );
  });

  it('creates a CursusVersion with version 1 when no previous version exists', async () => {
    await handler(makeEvent());

    expect(txMock.mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1, cursusId: 'cursus-id-001' }),
      }),
    );
  });

  it('increments version number when a previous version exists (latest = 3 → next = 4)', async () => {
    mockCursusFindUnique.mockResolvedValue({
      ...DRAFT_CURSUS,
      versions: [{ version: 3 }],
    });

    await handler(makeEvent());

    expect(txMock.mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 4 }),
      }),
    );
  });

  it('includes modules in the snapshotJson passed to CursusVersion', async () => {
    await handler(makeEvent());

    const createCall = txMock.mockCreate.mock.calls[0]?.[0] as {
      data?: { snapshotJson?: { modules: unknown[] } };
    };
    expect(createCall?.data?.snapshotJson?.modules).toHaveLength(1);
    expect(createCall?.data?.snapshotJson?.modules?.[0]).toMatchObject({
      id: 'mod-1',
      title: 'Intro HTML',
    });
  });

  it('fetches the updated cursus after the transaction to return fresh data', async () => {
    await handler(makeEvent());

    expect(txMock.mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cursus-id-001' } }),
    );
  });
});

describe('POST /api/cursus/:id/publish — missing router param', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('throws 400 when cursus id is missing from route', async () => {
    mockGetRouterParam.mockReturnValue(undefined);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});
