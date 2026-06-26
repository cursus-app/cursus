// @vitest-environment node
//
// Tests unitaires pour POST /api/cohortes — création d'une cohorte DRAFT (ST-04.1).
// On mock Prisma, Supabase et les globals Nitro.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCursusFindUnique = vi.fn();
const mockCursusVersionFindFirst = vi.fn();
const mockCohorteCreate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    cursusVersion: { findFirst: mockCursusVersionFindFirst },
    cohorte: { create: mockCohorteCreate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Nitro/H3 globals
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

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const VALID_BODY = {
  name: 'Promo Automne 2026',
  cursusId: '11111111-1111-1111-1111-111111111111',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  rhythm: 'WEEKLY' as const,
};

const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };

const PUBLISHED_CURSUS = {
  id: '11111111-1111-1111-1111-111111111111',
  status: 'PUBLISHED',
};

const CURSUS_VERSION = { id: 'version-uuid-001', version: 2 };

const importHandler = () => import('~~/server/api/cohortes/index.post');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('POST /api/cohortes — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
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
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('POST /api/cohortes — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when user is STAGIAIRE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'stagiaire-uuid' });
    mockUserFindUnique.mockResolvedValue({ id: 'stagiaire-uuid', globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when user is CO_FORMATEUR (not principal)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'cofo-uuid' });
    mockUserFindUnique.mockResolvedValue({ id: 'cofo-uuid', globalRole: 'CO_FORMATEUR' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows FORMATEUR_PRINCIPAL to create a cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockCursusVersionFindFirst.mockResolvedValue(CURSUS_VERSION);
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-001',
      ...VALID_BODY,
      status: 'DRAFT',
      cursusVersionId: CURSUS_VERSION.id,
      cursusVersion: { cursus: { id: PUBLISHED_CURSUS.id } },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });

  it('allows ADMIN to create a cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockCursusVersionFindFirst.mockResolvedValue(CURSUS_VERSION);
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-002',
      status: 'DRAFT',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });
});

// ─── Tests — Validation ───────────────────────────────────────────────────────

describe('POST /api/cohortes — cursus resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 404 when cursus does not exist', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 422 when cursus is not PUBLISHED', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue({ id: PUBLISHED_CURSUS.id, status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when no version exists for cursus', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockCursusVersionFindFirst.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('uses the latest version (highest version number)', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockCursusVersionFindFirst.mockResolvedValue({ id: 'v3-id', version: 3 });
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-003',
      status: 'DRAFT',
      cursusVersionId: 'v3-id',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCohorteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cursusVersionId: 'v3-id' }),
      }),
    );
  });
});

// ─── Tests — Creation behaviour ───────────────────────────────────────────────

describe('POST /api/cohortes — creation behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue(PUBLISHED_CURSUS);
    mockCursusVersionFindFirst.mockResolvedValue(CURSUS_VERSION);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates cohorte with status DRAFT', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-004',
      status: 'DRAFT',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCohorteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
  });

  it('stores name from body', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-005',
      name: VALID_BODY.name,
      status: 'DRAFT',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCohorteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: VALID_BODY.name }),
      }),
    );
  });

  it('stores rhythm BIWEEKLY when specified', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, rhythm: 'BIWEEKLY' as const });
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-006',
      status: 'DRAFT',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCohorteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rhythm: 'BIWEEKLY' }),
      }),
    );
  });

  it('converts startDate string to Date object', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCohorteCreate.mockResolvedValue({
      id: 'cohorte-uuid-007',
      status: 'DRAFT',
      cursusVersion: { cursus: {} },
      _count: { memberships: 0 },
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCohorteCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.startDate).toBeInstanceOf(Date);
    expect(createCall?.data?.endDate).toBeInstanceOf(Date);
  });
});
