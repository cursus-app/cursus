// @vitest-environment node
//
// Tests unitaires pour PATCH /api/cursus/:id/modules/:moduleId (ST-03.3).
// Couvre : authentification, autorisation, validation, mise à jour des ressources.
// Tests de sécurité SSRF via le module ogScraper (voir ogScraper.spec.ts).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockModuleFindUnique = vi.fn();
const mockModuleUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    module: {
      findUnique: mockModuleFindUnique,
      update: mockModuleUpdate,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
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
vi.stubGlobal('getRouterParam', vi.fn());

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CURSUS_ID = 'cursus-uuid-001';
const MODULE_ID = 'module-uuid-001';
const OWNER_ID = 'owner-uuid-001';

const FORMATEUR = { id: OWNER_ID, globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN = { id: 'admin-uuid-001', globalRole: 'ADMIN' };
const OTHER_FORMATEUR = { id: 'other-formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };

const MODULE_FIXTURE = {
  id: MODULE_ID,
  cursusId: CURSUS_ID,
  cursus: { ownerId: OWNER_ID },
};

const VALID_RESOURCE = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  url: 'https://developer.mozilla.org/fr/docs/Web/JavaScript',
  title: 'MDN JavaScript',
  type: 'article' as const,
  position: 0,
  status: 'active' as const,
};

function makeEvent(cursusId = CURSUS_ID, moduleId = MODULE_ID) {
  // getRouterParam is globally mocked — configure per-test via mockGetRouterParam
  return { node: { req: {}, res: {} }, cursusId, moduleId };
}

const mockGetRouterParam = vi.mocked(globalThis.getRouterParam as (event: unknown, key: string) => string | undefined);

function setupRouterParams(cursusId = CURSUS_ID, moduleId = MODULE_ID) {
  mockGetRouterParam.mockImplementation((_event, key) => {
    if (key === 'id') { return cursusId; }
    if (key === 'moduleId') { return moduleId; }
    return undefined;
  });
}

const importHandler = () =>
  import('~~/server/api/cursus/[id]/modules/[moduleId].patch');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('PATCH /api/cursus/:id/modules/:moduleId — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupRouterParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('PATCH /api/cursus/:id/modules/:moduleId — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupRouterParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 404 when module does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when module belongs to a different cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue({
      ...MODULE_FIXTURE,
      cursusId: 'other-cursus-id',
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when authenticated user is not the cursus owner', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER_FORMATEUR.id });
    mockUserFindUnique.mockResolvedValue(OTHER_FORMATEUR);
    mockModuleFindUnique.mockResolvedValue(MODULE_FIXTURE);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to update any module regardless of ownership', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN.id });
    mockUserFindUnique.mockResolvedValue(ADMIN);
    mockModuleFindUnique.mockResolvedValue(MODULE_FIXTURE);
    mockReadValidatedBody.mockResolvedValue({ resources: [VALID_RESOURCE] });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, resourcesJson: [VALID_RESOURCE] });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
  });

  it('allows cursus owner (FORMATEUR) to update module resources', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue(MODULE_FIXTURE);
    mockReadValidatedBody.mockResolvedValue({ resources: [VALID_RESOURCE] });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, resourcesJson: [VALID_RESOURCE] });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: MODULE_ID });
  });
});

// ─── Tests — Resources validation ────────────────────────────────────────────

describe('PATCH /api/cursus/:id/modules/:moduleId — resource validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupRouterParams();
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockModuleFindUnique.mockResolvedValue(MODULE_FIXTURE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores resources array in resourcesJson field', async () => {
    const resources = [VALID_RESOURCE];
    mockReadValidatedBody.mockResolvedValue({ resources });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, resourcesJson: resources });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resourcesJson: resources }),
      }),
    );
  });

  it('allows updating module title without touching resources', async () => {
    mockReadValidatedBody.mockResolvedValue({ title: 'New Title' });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, title: 'New Title' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New Title' }),
      }),
    );
    // resourcesJson should NOT be in the data payload when resources not provided
    const callData = mockModuleUpdate.mock.calls[0]?.[0]?.data;
    expect(callData).not.toHaveProperty('resourcesJson');
  });

  it('allows updating week field', async () => {
    mockReadValidatedBody.mockResolvedValue({ week: 3 });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, week: 3 });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callData = mockModuleUpdate.mock.calls[0]?.[0]?.data;
    expect(callData).toMatchObject({ week: 3 });
  });

  it('allows updating xpReward field', async () => {
    mockReadValidatedBody.mockResolvedValue({ xpReward: 200 });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, xpReward: 200 });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callData = mockModuleUpdate.mock.calls[0]?.[0]?.data;
    expect(callData).toMatchObject({ xpReward: 200 });
  });

  it('allows an empty resources array (clearing all resources)', async () => {
    mockReadValidatedBody.mockResolvedValue({ resources: [] });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, resourcesJson: [] });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callData = mockModuleUpdate.mock.calls[0]?.[0]?.data;
    expect(callData?.resourcesJson).toEqual([]);
  });

  it('handles multiple resources with correct positions', async () => {
    const resources = [
      { ...VALID_RESOURCE, id: '550e8400-e29b-41d4-a716-446655440001', position: 0 },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        url: 'https://freecodecamp.org',
        title: 'freeCodeCamp',
        type: 'course' as const,
        position: 1,
        status: 'active' as const,
      },
    ];
    mockReadValidatedBody.mockResolvedValue({ resources });
    mockModuleUpdate.mockResolvedValue({ id: MODULE_ID, resourcesJson: resources });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const callData = mockModuleUpdate.mock.calls[0]?.[0]?.data;
    expect(callData?.resourcesJson).toHaveLength(2);
  });
});

// ─── Tests — Missing params ───────────────────────────────────────────────────

describe('PATCH /api/cursus/:id/modules/:moduleId — missing params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 400 when cursus id is missing', async () => {
    mockGetRouterParam.mockImplementation((_event, key) => {
      if (key === 'id') { return undefined; }
      if (key === 'moduleId') { return MODULE_ID; }
      return undefined;
    });
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when module id is missing', async () => {
    mockGetRouterParam.mockImplementation((_event, key) => {
      if (key === 'id') { return CURSUS_ID; }
      if (key === 'moduleId') { return undefined; }
      return undefined;
    });
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER_ID });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});
