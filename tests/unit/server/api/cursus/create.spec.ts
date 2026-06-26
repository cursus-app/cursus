// @vitest-environment node
//
// Tests unitaires pour POST /api/cursus — création d'un cursus DRAFT (ST-03.1).
// On mock Prisma, Supabase et les globals Nitro.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCursusFindUnique = vi.fn();
const mockCursusCreate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: {
      findUnique: mockCursusFindUnique,
      create: mockCursusCreate,
    },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const VALID_BODY = {
  title: 'Mon Cursus Dev Web',
  domain: 'dev-web' as const,
  level: 'BEGINNER' as const,
  durationWeeks: 12,
};

const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };

const importHandler = () => import('~~/server/api/cursus/index.post');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/cursus — authentication', () => {
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

describe('POST /api/cursus — authorization', () => {
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

  it('allows FORMATEUR_PRINCIPAL to create a cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null); // slug not taken
    mockCursusCreate.mockResolvedValue({
      id: 'new-cursus-id',
      ...VALID_BODY,
      slug: 'mon-cursus-dev-web',
      status: 'DRAFT',
      ownerId: FORMATEUR_USER.id,
      description: null,
      prerequisites: null,
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });

  it('allows CO_FORMATEUR to create a cursus', async () => {
    const user = { id: 'coformateur-uuid', globalRole: 'CO_FORMATEUR' };
    mockServerSupabaseUser.mockResolvedValue({ id: user.id });
    mockUserFindUnique.mockResolvedValue(user);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'new-id', status: 'DRAFT', ownerId: user.id });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });

  it('allows ADMIN to create a cursus', async () => {
    const user = { id: 'admin-uuid', globalRole: 'ADMIN' };
    mockServerSupabaseUser.mockResolvedValue({ id: user.id });
    mockUserFindUnique.mockResolvedValue(user);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'new-id', status: 'DRAFT', ownerId: user.id });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });
});

describe('POST /api/cursus — creation behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates cursus with status DRAFT', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c1', status: 'DRAFT', ownerId: FORMATEUR_USER.id });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockCursusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', ownerId: FORMATEUR_USER.id }),
      }),
    );
  });

  it('auto-generates slug from title when slug not provided', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, title: 'Mon Super Cursus', slug: undefined });
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c2', slug: 'mon-super-cursus', status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.slug).toBe('mon-super-cursus');
  });

  it('normalizes accented characters in auto-generated slug', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, title: 'Développement Avancé', slug: undefined });
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c3', slug: 'developpement-avance', status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.slug).toBe('developpement-avance');
  });

  it('uses provided slug when explicitly given in body', async () => {
    const customSlug = 'my-custom-slug';
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, slug: customSlug });
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c4', slug: customSlug, status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.slug).toBe(customSlug);
  });

  it('resolves slug collision by appending -2 suffix', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, title: 'Mon Cursus', slug: undefined });
    // First findUnique call: slug taken, second: suffix free
    mockCursusFindUnique
      .mockResolvedValueOnce({ id: 'existing-1' }) // 'mon-cursus' exists
      .mockResolvedValueOnce(null);                // 'mon-cursus-2' free
    mockCursusCreate.mockResolvedValue({ id: 'c5', slug: 'mon-cursus-2', status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.slug).toBe('mon-cursus-2');
  });

  it('resolves slug collision by incrementing suffix from -2 to -3', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY, title: 'Mon Cursus', slug: undefined });
    mockCursusFindUnique
      .mockResolvedValueOnce({ id: 'existing-1' }) // 'mon-cursus' exists
      .mockResolvedValueOnce({ id: 'existing-2' }) // 'mon-cursus-2' exists
      .mockResolvedValueOnce(null);                // 'mon-cursus-3' free
    mockCursusCreate.mockResolvedValue({ id: 'c6', slug: 'mon-cursus-3', status: 'DRAFT' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.slug).toBe('mon-cursus-3');
  });

  it('stores description as null when omitted from body', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY }); // no description
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c7', status: 'DRAFT', description: null });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.description).toBeNull();
  });

  it('stores prerequisites as null when omitted from body', async () => {
    mockReadValidatedBody.mockResolvedValue({ ...VALID_BODY }); // no prerequisites
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c8', status: 'DRAFT', prerequisites: null });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.prerequisites).toBeNull();
  });

  it('stores ownerId as the authenticated user id', async () => {
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockCursusFindUnique.mockResolvedValue(null);
    mockCursusCreate.mockResolvedValue({ id: 'c9', status: 'DRAFT', ownerId: FORMATEUR_USER.id });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0];
    expect(createCall?.data?.ownerId).toBe(FORMATEUR_USER.id);
  });
});
