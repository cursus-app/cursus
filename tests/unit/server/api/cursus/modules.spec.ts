// @vitest-environment node
//
// Tests unitaires pour les endpoints modules d'un cursus (ST-03.2).
// Couvre : list, create, update, delete, reorder.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCursusFindUnique = vi.fn();
const mockModuleFindMany = vi.fn();
const mockModuleFindFirst = vi.fn();
const mockModuleCreate = vi.fn();
const mockModuleUpdate = vi.fn();
const mockModuleDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    module: {
      findMany: mockModuleFindMany,
      findFirst: mockModuleFindFirst,
      create: mockModuleCreate,
      update: mockModuleUpdate,
      delete: mockModuleDelete,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Nitro/H3 globals
const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const CURSUS_ID = '11111111-1111-1111-1111-111111111111';
const MODULE_ID = '22222222-2222-2222-2222-222222222222';
const OWNER_ID = 'owner-uuid-001';
const ADMIN_ID = 'admin-uuid-001';

const DRAFT_CURSUS = { id: CURSUS_ID, ownerId: OWNER_ID, status: 'DRAFT' };
const PUBLISHED_CURSUS = { id: CURSUS_ID, ownerId: OWNER_ID, status: 'PUBLISHED' };
const ARCHIVED_CURSUS = { id: CURSUS_ID, ownerId: OWNER_ID, status: 'ARCHIVED' };

const OWNER_DB_USER = { id: OWNER_ID, globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_DB_USER = { id: ADMIN_ID, globalRole: 'ADMIN' };
const STAGIAIRE_DB_USER = { id: 'stagiaire-id', globalRole: 'STAGIAIRE' };

const SAMPLE_MODULE = {
  id: MODULE_ID,
  cursusId: CURSUS_ID,
  week: 1,
  title: 'Introduction',
  objectives: 'Apprendre les bases',
  resourcesJson: [],
  deliverableSpecJson: { description: '', repoRequired: true, deployRequired: false },
  xpReward: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const VALID_MODULE_BODY = {
  title: 'Introduction à Git',
  objectives: 'Maîtriser les bases de Git',
  resourcesJson: [],
  deliverableSpecJson: { description: 'Livraison', repoRequired: true, deployRequired: false },
  xpReward: 100,
};

// ─── GET /api/cursus/:id/modules ──────────────────────────────────────────────

describe('GET /api/cursus/:id/modules — authentication & authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when cursus does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when DRAFT cursus is accessed by non-owner', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'other-user' });
    mockUserFindUnique.mockResolvedValue({ id: 'other-user', globalRole: 'STAGIAIRE' });
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows owner to list modules of DRAFT cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindMany.mockResolvedValue([SAMPLE_MODULE]);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    const result = await handler(makeEvent());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: MODULE_ID });
  });

  it('allows any authenticated user to list modules of PUBLISHED cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'other-user' });
    mockUserFindUnique.mockResolvedValue({ id: 'other-user', globalRole: 'STAGIAIRE' });
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockModuleFindMany.mockResolvedValue([SAMPLE_MODULE]);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    const result = await handler(makeEvent());
    expect(result).toHaveLength(1);
  });

  it('allows admin to list modules of DRAFT cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_ID });
    mockUserFindUnique.mockResolvedValue(ADMIN_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindMany.mockResolvedValue([]);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.get');
    const result = await handler(makeEvent());
    expect(result).toEqual([]);
  });
});

// ─── POST /api/cursus/:id/modules ─────────────────────────────────────────────

describe('POST /api/cursus/:id/modules — create module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindFirst.mockResolvedValue(null); // no week conflict
    mockModuleCreate.mockResolvedValue(SAMPLE_MODULE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is not owner or admin', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'other-id' });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_DB_USER);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 422 when cursus is PUBLISHED (not DRAFT)', async () => {
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockReadValidatedBody.mockResolvedValue(VALID_MODULE_BODY);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when cursus is ARCHIVED', async () => {
    mockCursusFindUnique.mockResolvedValue(ARCHIVED_CURSUS);
    mockReadValidatedBody.mockResolvedValue(VALID_MODULE_BODY);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('auto-increments week from max existing + 1', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_MODULE_BODY, week: undefined });
    // findFirst for week auto-increment: returns a module with week=3
    mockModuleFindFirst
      .mockResolvedValueOnce({ week: 3 }) // max existing week
      .mockResolvedValueOnce(null); // no conflict for week=4

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await handler(makeEvent());

    expect(mockModuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ week: 4 }),
      }),
    );
  });

  it('uses week=1 when no existing modules', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_MODULE_BODY, week: undefined });
    mockModuleFindFirst
      .mockResolvedValueOnce(null) // no existing modules
      .mockResolvedValueOnce(null); // no conflict for week=1

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await handler(makeEvent());

    expect(mockModuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ week: 1 }),
      }),
    );
  });

  it('throws 409 when week already exists in cursus', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_MODULE_BODY, week: 1 });
    // First findFirst for auto-increment check is not called when week is provided.
    // The second findFirst for week conflict check returns an existing module.
    mockModuleFindFirst.mockResolvedValue({ id: 'existing-module' });

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates module successfully', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_MODULE_BODY, week: 2 });
    mockModuleFindFirst.mockResolvedValue(null); // no conflict

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/index.post');
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
    expect(mockModuleCreate).toHaveBeenCalled();
  });
});

// ─── PATCH /api/cursus/:id/modules/:moduleId ──────────────────────────────────

describe('PATCH /api/cursus/:id/modules/:moduleId — update module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam
      .mockReturnValueOnce(CURSUS_ID) // id
      .mockReturnValueOnce(MODULE_ID); // moduleId
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindFirst.mockResolvedValue({ id: MODULE_ID, week: 1 });
    mockModuleUpdate.mockResolvedValue(SAMPLE_MODULE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/[moduleId].patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is not owner', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'intruder' });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_DB_USER);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/[moduleId].patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when module not found in cursus', async () => {
    mockModuleFindFirst.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/[moduleId].patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates module title successfully', async () => {
    mockReadValidatedBody.mockResolvedValue({ title: 'Nouveau titre' });

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/[moduleId].patch');
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
    expect(mockModuleUpdate).toHaveBeenCalled();
  });

  it('throws 422 when cursus is not DRAFT', async () => {
    mockCursusFindUnique.mockResolvedValue(ARCHIVED_CURSUS);
    mockReadValidatedBody.mockResolvedValue({ title: 'New' });

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/[moduleId].patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });
});

// ─── DELETE /api/cursus/:id/modules/:moduleId ─────────────────────────────────

describe('DELETE /api/cursus/:id/modules/:moduleId — delete module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValueOnce(CURSUS_ID).mockReturnValueOnce(MODULE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindFirst.mockResolvedValue({ id: MODULE_ID });
    mockModuleDelete.mockResolvedValue({ id: MODULE_ID });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } =
      await import('~~/server/api/cursus/[id]/modules/[moduleId].delete');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is not owner or admin', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'intruder' });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_DB_USER);

    const { default: handler } =
      await import('~~/server/api/cursus/[id]/modules/[moduleId].delete');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when module not found', async () => {
    mockModuleFindFirst.mockResolvedValue(null);

    const { default: handler } =
      await import('~~/server/api/cursus/[id]/modules/[moduleId].delete');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 when cursus is not DRAFT', async () => {
    mockCursusFindUnique.mockResolvedValue(ARCHIVED_CURSUS);

    const { default: handler } =
      await import('~~/server/api/cursus/[id]/modules/[moduleId].delete');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('deletes module and returns success', async () => {
    const { default: handler } =
      await import('~~/server/api/cursus/[id]/modules/[moduleId].delete');
    const result = await handler(makeEvent());
    expect(result).toEqual({ success: true });
    expect(mockModuleDelete).toHaveBeenCalledWith({ where: { id: MODULE_ID } });
  });
});

// ─── PATCH /api/cursus/:id/modules/order ──────────────────────────────────────

describe('PATCH /api/cursus/:id/modules/order — bulk reorder', () => {
  const VALID_ORDER_BODY = {
    modules: [
      { id: MODULE_ID, week: 2 },
      { id: '33333333-3333-3333-3333-333333333333', week: 1 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(OWNER_DB_USER);
    mockCursusFindUnique.mockResolvedValue(DRAFT_CURSUS);
    mockModuleFindMany
      .mockResolvedValueOnce([
        // Simule les modules trouvés par cursusId + id filter
        { id: MODULE_ID },
        { id: '33333333-3333-3333-3333-333333333333' },
      ])
      .mockResolvedValueOnce([SAMPLE_MODULE]); // after reorder
    mockTransaction.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is not owner', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'intruder' });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_DB_USER);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 422 when cursus is not DRAFT', async () => {
    mockCursusFindUnique.mockResolvedValue(ARCHIVED_CURSUS);
    mockReadValidatedBody.mockResolvedValue(VALID_ORDER_BODY);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when duplicate weeks in body', async () => {
    mockReadValidatedBody.mockResolvedValue({
      modules: [
        { id: MODULE_ID, week: 1 },
        { id: '33333333-3333-3333-3333-333333333333', week: 1 }, // duplicate
      ],
    });

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when module ids do not belong to cursus', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_ORDER_BODY);
    // Reset queue and return only 1 of 2 expected modules.
    mockModuleFindMany.mockReset();
    mockModuleFindMany.mockResolvedValueOnce([{ id: MODULE_ID }]); // 1 found, but 2 expected

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('reorders modules and returns updated list', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_ORDER_BODY);

    const { default: handler } = await import('~~/server/api/cursus/[id]/modules/order.patch');
    const result = await handler(makeEvent());
    expect(mockTransaction).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
