// @vitest-environment node
//
// Tests unitaires pour GET /api/cursus — liste paginée avec filtres (ST-03.1).
// On mock Prisma et Supabase — pas de vraie DB nécessaire.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockCursusFindMany = vi.fn();
const mockCursusCount = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    cursus: {
      findMany: mockCursusFindMany,
      count: mockCursusCount,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Nitro/H3 globals
const mockGetValidatedQuery = vi.fn();
vi.stubGlobal('getValidatedQuery', mockGetValidatedQuery);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_CURSUS_LIST = { data: [], total: 0, page: 1, limit: 20 };

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

function makeDefaultQuery(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    limit: 20,
    status: undefined,
    domain: undefined,
    level: undefined,
    ...overrides,
  };
}

const importHandler = () => import('~~/server/api/cursus/index.get');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/cursus — visibility rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCursusFindMany.mockResolvedValue([]);
    mockCursusCount.mockResolvedValue(0);
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only PUBLISHED cursus when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
      }),
    );
  });

  it('returns PUBLISHED + own cursus when caller is FORMATEUR_PRINCIPAL', async () => {
    const ownerId = 'formateur-uuid-001';
    mockServerSupabaseUser.mockResolvedValue({ id: ownerId });
    mockUserFindUnique.mockResolvedValue({ id: ownerId, globalRole: 'FORMATEUR_PRINCIPAL' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(callArg?.where).toMatchObject({
      OR: [{ status: 'PUBLISHED' }, { ownerId }],
    });
  });

  it('returns PUBLISHED + own cursus when caller is CO_FORMATEUR', async () => {
    const ownerId = 'coformateur-uuid-001';
    mockServerSupabaseUser.mockResolvedValue({ id: ownerId });
    mockUserFindUnique.mockResolvedValue({ id: ownerId, globalRole: 'CO_FORMATEUR' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(callArg?.where).toMatchObject({
      OR: [{ status: 'PUBLISHED' }, { ownerId }],
    });
  });

  it('returns PUBLISHED + own cursus when caller is ADMIN', async () => {
    const ownerId = 'admin-uuid-001';
    mockServerSupabaseUser.mockResolvedValue({ id: ownerId });
    mockUserFindUnique.mockResolvedValue({ id: ownerId, globalRole: 'ADMIN' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(callArg?.where).toMatchObject({
      OR: [{ status: 'PUBLISHED' }, { ownerId }],
    });
  });

  it('returns only PUBLISHED cursus when caller is STAGIAIRE (same as unauthenticated)', async () => {
    const stagiaireId = 'stagiaire-uuid-001';
    mockServerSupabaseUser.mockResolvedValue({ id: stagiaireId });
    mockUserFindUnique.mockResolvedValue({ id: stagiaireId, globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
      }),
    );
  });

  it('falls back to PUBLISHED-only when authenticated user has no DB record', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'ghost-user' });
    mockUserFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
      }),
    );
  });
});

describe('GET /api/cursus — pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue(null);
    mockCursusFindMany.mockResolvedValue([]);
    mockCursusCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes skip = (page - 1) * limit correctly for page 2 with limit 10', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ page: 2, limit: 10 }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('computes skip = 0 for page 1', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ page: 1, limit: 20 }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('computes skip = 40 for page 3 with limit 20', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ page: 3, limit: 20 }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it('returns pagination metadata in the response', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ page: 2, limit: 5 }));
    mockCursusCount.mockResolvedValue(42);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({
      total: 42,
      page: 2,
      limit: 5,
    });
  });
});

describe('GET /api/cursus — filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue(null);
    mockCursusFindMany.mockResolvedValue([]);
    mockCursusCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds status condition to WHERE when status filter provided', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ status: 'PUBLISHED' }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Unauthenticated + status=PUBLISHED → single condition { status: 'PUBLISHED' }
    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(JSON.stringify(callArg?.where)).toContain('PUBLISHED');
  });

  it('adds domain condition to WHERE when domain filter provided', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ domain: 'ia' }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(JSON.stringify(callArg?.where)).toContain('ia');
  });

  it('adds level condition to WHERE when level filter provided', async () => {
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ level: 'ADVANCED' }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    expect(JSON.stringify(callArg?.where)).toContain('ADVANCED');
  });

  it('combines multiple filters as AND conditions for authenticated formateur', async () => {
    const ownerId = 'formateur-uuid-002';
    mockServerSupabaseUser.mockResolvedValue({ id: ownerId });
    mockUserFindUnique.mockResolvedValue({ id: ownerId, globalRole: 'FORMATEUR_PRINCIPAL' });
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery({ status: 'DRAFT', domain: 'ia' }));

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callArg = mockCursusFindMany.mock.calls[0]?.[0];
    // Multiple conditions → wrapped in AND
    expect(callArg?.where).toHaveProperty('AND');
  });
});

describe('GET /api/cursus — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { data, total, page, limit }', async () => {
    const fakeCursus = [
      {
        id: 'cid-1',
        title: 'Web Dev Bootcamp',
        slug: 'web-dev-bootcamp',
        domain: 'dev-web',
        level: 'BEGINNER',
        durationWeeks: 12,
        status: 'PUBLISHED',
        ownerId: 'owner-1',
        createdAt: new Date().toISOString(),
        _count: { modules: 3 },
      },
    ];
    mockCursusFindMany.mockResolvedValue(fakeCursus);
    mockCursusCount.mockResolvedValue(1);
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery());

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toEqual({ data: fakeCursus, total: 1, page: 1, limit: 20 });
  });

  it('returns empty data array when no cursus found', async () => {
    mockCursusFindMany.mockResolvedValue([]);
    mockCursusCount.mockResolvedValue(0);
    mockGetValidatedQuery.mockResolvedValue(makeDefaultQuery());

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toEqual(EMPTY_CURSUS_LIST);
  });
});
