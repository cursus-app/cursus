// @vitest-environment node
//
// Tests unitaires pour les endpoints co-formateurs (ST-04.3) :
//   POST   /api/cohortes/:id/co-formateurs
//   DELETE /api/cohortes/:id/co-formateurs/:userId
//   PATCH  /api/cohortes/:id/co-formateurs/:userId

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockMembershipFindUnique = vi.fn();
const mockMembershipCreate = vi.fn();
const mockMembershipUpdate = vi.fn();
const mockMembershipDelete = vi.fn();
const mockCohorteFindUnique = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    membership: {
      findUnique: mockMembershipFindUnique,
      create: mockMembershipCreate,
      update: mockMembershipUpdate,
      delete: mockMembershipDelete,
    },
    cohorte: { findUnique: mockCohorteFindUnique },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
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

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const COHORTE_ID = 'cohorte-uuid-001';
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };
const STAGIAIRE_USER = { id: 'stagiaire-uuid-001', globalRole: 'STAGIAIRE' };
const TARGET_USER = {
  id: 'target-uuid-001',
  globalRole: null,
  email: 'coformateur@example.fr',
};

const FORMATEUR_MEMBERSHIP = { role: 'FORMATEUR_PRINCIPAL' };
const CO_FORMATEUR_MEMBERSHIP = { id: 'membership-uuid-001', role: 'CO_FORMATEUR' };
const NULL_MEMBERSHIP = null;

function setupGetRouterParam(id: string, userId?: string) {
  mockGetRouterParam.mockImplementation((_event: unknown, param: string) => {
    if (param === 'id') {
      return id;
    }
    if (param === 'userId') {
      return userId ?? null;
    }
    return null;
  });
}

// ─── POST /api/cohortes/:id/co-formateurs ─────────────────────────────────────

describe('POST /api/cohortes/:id/co-formateurs', () => {
  const importHandler = () => import('~~/server/api/cohortes/[id]/co-formateurs.post');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupGetRouterParam(COHORTE_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when authenticated user has no DB profile', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'ghost-user' });
    mockUserFindUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  // ─── Authorization ────────────────────────────────────────────────────────

  it('throws 403 when user is STAGIAIRE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_USER.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_USER);
    mockMembershipFindUnique.mockResolvedValue({ role: 'STAGIAIRE' });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when user is CO_FORMATEUR (security: cannot self-promote)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'cofo-uuid' });
    mockUserFindUnique.mockResolvedValue({ id: 'cofo-uuid', globalRole: 'CO_FORMATEUR' });
    mockMembershipFindUnique.mockResolvedValue({ role: 'CO_FORMATEUR' });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to add co-formateur', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER) // actor
      .mockResolvedValueOnce(TARGET_USER); // target
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique.mockResolvedValue(NULL_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds: null });
    mockMembershipCreate.mockResolvedValue({
      id: 'membership-001',
      role: 'CO_FORMATEUR',
      moduleIds: null,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ role: 'CO_FORMATEUR' });
  });

  it('allows FORMATEUR_PRINCIPAL to add co-formateur', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(FORMATEUR_USER) // actor
      .mockResolvedValueOnce(TARGET_USER); // target
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // actor membership check
      .mockResolvedValueOnce(NULL_MEMBERSHIP); // target existing membership
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds: null });
    mockMembershipCreate.mockResolvedValue({
      id: 'membership-002',
      role: 'CO_FORMATEUR',
      moduleIds: null,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ role: 'CO_FORMATEUR' });
  });

  // ─── Behaviour ────────────────────────────────────────────────────────────

  it('creates membership with global scope (moduleIds: null)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TARGET_USER);
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique.mockResolvedValue(NULL_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds: null });
    mockMembershipCreate.mockResolvedValue({
      id: 'membership-003',
      role: 'CO_FORMATEUR',
      moduleIds: null,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockMembershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Prisma.DbNull est utilisé pour stocker NULL explicitement dans un champ Json?
        data: expect.objectContaining({ role: 'CO_FORMATEUR', moduleIds: Prisma.DbNull }),
      }),
    );
  });

  it('creates membership with limited scope (moduleIds: [...])', async () => {
    const moduleIds = ['mod-uuid-1', 'mod-uuid-2'];
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TARGET_USER);
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique.mockResolvedValue(NULL_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds });
    mockMembershipCreate.mockResolvedValue({
      id: 'membership-004',
      role: 'CO_FORMATEUR',
      moduleIds,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockMembershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'CO_FORMATEUR', moduleIds }),
      }),
    );
  });

  it('throws 409 when target is already FORMATEUR_PRINCIPAL', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TARGET_USER);
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique.mockResolvedValue({ role: 'FORMATEUR_PRINCIPAL' });
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds: null });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 404 when cohorte does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockCohorteFindUnique.mockResolvedValue(null);
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('upserts role when user is already a member (e.g. STAGIAIRE → CO_FORMATEUR)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TARGET_USER);
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockMembershipFindUnique.mockResolvedValue({ role: 'STAGIAIRE' });
    mockReadValidatedBody.mockResolvedValue({ email: TARGET_USER.email, moduleIds: null });
    mockMembershipUpdate.mockResolvedValue({
      id: 'membership-005',
      role: 'CO_FORMATEUR',
      moduleIds: null,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'CO_FORMATEUR' }),
      }),
    );
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it('throws 404 when target user email is not found', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(null); // target not found
    mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
    mockReadValidatedBody.mockResolvedValue({ email: 'unknown@example.fr', moduleIds: null });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── DELETE /api/cohortes/:id/co-formateurs/:userId ──────────────────────────

describe('DELETE /api/cohortes/:id/co-formateurs/:userId', () => {
  const importHandler = () =>
    import('~~/server/api/cohortes/[id]/co-formateurs/[userId].delete');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupGetRouterParam(COHORTE_ID, TARGET_USER.id);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when actor is not FORMATEUR_PRINCIPAL of this cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_USER.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_USER);
    mockMembershipFindUnique.mockResolvedValue({ role: 'STAGIAIRE' });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when target membership does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // actor
      .mockResolvedValueOnce(NULL_MEMBERSHIP); // target
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 when target is not CO_FORMATEUR', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // actor
      .mockResolvedValueOnce({ id: 'mem-001', role: 'STAGIAIRE' }); // target has different role
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('deletes the membership when actor is FORMATEUR_PRINCIPAL', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // actor
      .mockResolvedValueOnce(CO_FORMATEUR_MEMBERSHIP); // target
    mockMembershipDelete.mockResolvedValue({});

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ success: true });
    expect(mockMembershipDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_cohorteId: { userId: TARGET_USER.id, cohorteId: COHORTE_ID } },
      }),
    );
  });

  it('allows ADMIN to remove any co-formateur', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockMembershipFindUnique.mockResolvedValue(CO_FORMATEUR_MEMBERSHIP); // target only (admin skips actor check)
    mockMembershipDelete.mockResolvedValue({});

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ success: true });
  });
});

// ─── PATCH /api/cohortes/:id/co-formateurs/:userId ───────────────────────────

describe('PATCH /api/cohortes/:id/co-formateurs/:userId', () => {
  const importHandler = () =>
    import('~~/server/api/cohortes/[id]/co-formateurs/[userId].patch');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupGetRouterParam(COHORTE_ID, TARGET_USER.id);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when actor is CO_FORMATEUR (security: cannot self-assign modules)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'cofo-uuid' });
    mockUserFindUnique.mockResolvedValue({ id: 'cofo-uuid', globalRole: 'CO_FORMATEUR' });
    mockMembershipFindUnique.mockResolvedValue({ role: 'CO_FORMATEUR' });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when co-formateur not found in cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP)
      .mockResolvedValueOnce(NULL_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ moduleIds: null });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates moduleIds to null (global access)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP)
      .mockResolvedValueOnce(CO_FORMATEUR_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ moduleIds: null });
    mockMembershipUpdate.mockResolvedValue({
      ...CO_FORMATEUR_MEMBERSHIP,
      moduleIds: null,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Prisma.DbNull est utilisé pour stocker NULL explicitement dans un champ Json?
        data: expect.objectContaining({ moduleIds: Prisma.DbNull }),
      }),
    );
  });

  it('updates moduleIds to specific modules (limited access)', async () => {
    const newModuleIds = ['mod-a', 'mod-b', 'mod-c'];
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockMembershipFindUnique
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP)
      .mockResolvedValueOnce(CO_FORMATEUR_MEMBERSHIP);
    mockReadValidatedBody.mockResolvedValue({ moduleIds: newModuleIds });
    mockMembershipUpdate.mockResolvedValue({
      ...CO_FORMATEUR_MEMBERSHIP,
      moduleIds: newModuleIds,
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ moduleIds: newModuleIds }),
      }),
    );
    expect(result).toMatchObject({ moduleIds: newModuleIds });
  });

  it('allows ADMIN to update co-formateur modules', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockMembershipFindUnique.mockResolvedValue(CO_FORMATEUR_MEMBERSHIP); // target only
    mockReadValidatedBody.mockResolvedValue({ moduleIds: ['mod-x'] });
    mockMembershipUpdate.mockResolvedValue({
      ...CO_FORMATEUR_MEMBERSHIP,
      moduleIds: ['mod-x'],
      user: TARGET_USER,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ moduleIds: ['mod-x'] });
  });
});
