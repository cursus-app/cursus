// @vitest-environment node
//
// Tests unitaires pour les transitions de cycle de vie des cohortes (ST-04.1).
// Couvre : start (DRAFT → ACTIVE), complete (ACTIVE → COMPLETED), archive, delete.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCohorteFindUnique = vi.fn();
const mockCohorteUpdate = vi.fn();
const mockCohorteDelete = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cohorte: {
      findUnique: mockCohorteFindUnique,
      update: mockCohorteUpdate,
      delete: mockCohorteDelete,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  // @ts-expect-error — H3Error properties added for tests
  err.data = opts.data;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };
const COHORTE_ID = 'cohorte-uuid-001';

function makeDraftCohorte(overrides = {}) {
  return {
    id: COHORTE_ID,
    status: 'DRAFT',
    name: 'Promo Test',
    memberships: [],
    ...overrides,
  };
}

// ─── Tests — start.post ───────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/start', () => {
  const importHandler = () => import('~~/server/api/cohortes/[id]/start.post');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is STAGIAIRE', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'stagiaire-uuid', globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when cohorte does not exist', async () => {
    mockCohorteFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 when cohorte is not DRAFT', async () => {
    mockCohorteFindUnique.mockResolvedValue(makeDraftCohorte({ status: 'ACTIVE' }));

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when no STAGIAIRE in memberships', async () => {
    mockCohorteFindUnique.mockResolvedValue(
      makeDraftCohorte({
        memberships: [{ role: 'FORMATEUR_PRINCIPAL', userId: FORMATEUR_USER.id }],
      }),
    );

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when no FORMATEUR_PRINCIPAL in memberships', async () => {
    mockCohorteFindUnique.mockResolvedValue(
      makeDraftCohorte({
        memberships: [{ role: 'STAGIAIRE', userId: 'stagiaire-1' }],
      }),
    );

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 with missing roles data when neither stagiaire nor formateur', async () => {
    mockCohorteFindUnique.mockResolvedValue(makeDraftCohorte({ memberships: [] }));

    const { default: handler } = await importHandler();
    try {
      await handler(makeEvent());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const e = err as { statusCode: number; data?: { missingRoles: string[] } };
      expect(e.statusCode).toBe(422);
      expect(e.data?.missingRoles).toContain('STAGIAIRE');
      expect(e.data?.missingRoles).toContain('FORMATEUR_PRINCIPAL');
    }
  });

  it('transitions DRAFT → ACTIVE when pre-conditions are met', async () => {
    mockCohorteFindUnique.mockResolvedValue(
      makeDraftCohorte({
        memberships: [
          { role: 'STAGIAIRE', userId: 'stagiaire-1' },
          { role: 'FORMATEUR_PRINCIPAL', userId: FORMATEUR_USER.id },
        ],
      }),
    );
    mockCohorteUpdate.mockResolvedValue({ id: COHORTE_ID, status: 'ACTIVE' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'ACTIVE' });
    expect(mockCohorteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('admin can start a cohorte', async () => {
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockCohorteFindUnique.mockResolvedValue(
      makeDraftCohorte({
        memberships: [
          { role: 'STAGIAIRE', userId: 'stagiaire-1' },
          { role: 'FORMATEUR_PRINCIPAL', userId: 'fp-1' },
        ],
      }),
    );
    mockCohorteUpdate.mockResolvedValue({ id: COHORTE_ID, status: 'ACTIVE' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'ACTIVE' });
  });
});

// ─── Tests — complete.post ────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/complete', () => {
  const importHandler = () => import('~~/server/api/cohortes/[id]/complete.post');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 422 when cohorte is not ACTIVE', async () => {
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('transitions ACTIVE → COMPLETED', async () => {
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'ACTIVE' });
    mockCohorteUpdate.mockResolvedValue({ id: COHORTE_ID, status: 'COMPLETED' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'COMPLETED' });
  });
});

// ─── Tests — archive.post ─────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/archive', () => {
  const importHandler = () => import('~~/server/api/cohortes/[id]/archive.post');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 422 when cohorte is already ARCHIVED', async () => {
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'ARCHIVED' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when cohorte is DRAFT', async () => {
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('archives a COMPLETED cohorte', async () => {
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'COMPLETED' });
    mockCohorteUpdate.mockResolvedValue({
      id: COHORTE_ID,
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'ARCHIVED' });
    expect(mockCohorteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ARCHIVED', archivedAt: expect.any(Date) }),
      }),
    );
  });

  it('admin can archive an ACTIVE cohorte', async () => {
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID, status: 'ACTIVE' });
    mockCohorteUpdate.mockResolvedValue({
      id: COHORTE_ID,
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'ARCHIVED' });
  });
});

// ─── Tests — delete ───────────────────────────────────────────────────────────

describe('DELETE /api/cohortes/:id', () => {
  const importHandler = () => import('~~/server/api/cohortes/[id].delete');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 409 when cohorte is ACTIVE', async () => {
    mockCohorteFindUnique.mockResolvedValue({
      id: COHORTE_ID,
      status: 'ACTIVE',
      name: 'Test',
      memberships: [{ userId: FORMATEUR_USER.id }],
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 409 when cohorte is COMPLETED', async () => {
    mockCohorteFindUnique.mockResolvedValue({
      id: COHORTE_ID,
      status: 'COMPLETED',
      name: 'Test',
      memberships: [{ userId: FORMATEUR_USER.id }],
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('deletes a DRAFT cohorte', async () => {
    mockCohorteFindUnique.mockResolvedValue({
      id: COHORTE_ID,
      status: 'DRAFT',
      name: 'Test',
      memberships: [{ userId: FORMATEUR_USER.id }],
    });
    mockCohorteDelete.mockResolvedValue({ id: COHORTE_ID });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ success: true });
    expect(mockCohorteDelete).toHaveBeenCalledWith({ where: { id: COHORTE_ID } });
  });
});
