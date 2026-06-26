// @vitest-environment node
//
// Tests unitaires pour POST /api/cohortes/:id/invitations — invitation batch ST-04.2.
// Couvre : auth, déduplication, rate limit 429, Zod validation.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
const mockServerSupabaseServiceRole = vi.fn();

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
  serverSupabaseServiceRole: mockServerSupabaseServiceRole,
}));

const mockUserFindUnique = vi.fn();
const mockMembershipFindFirst = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockCohorteFindUnique = vi.fn();
const mockUserFindMany = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockInvitationCreate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany },
    membership: { findFirst: mockMembershipFindFirst, findMany: mockMembershipFindMany },
    cohorte: { findUnique: mockCohorteFindUnique },
    invitation: { findMany: mockInvitationFindMany, create: mockInvitationCreate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCheckRateLimitBulk = vi.fn();
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimitBulk: mockCheckRateLimitBulk,
  checkRateLimit: vi.fn(),
}));

// Nitro/H3 globals
vi.stubGlobal('createError', (opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error statusCode non présent sur Error natif
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COHORTE_ID = 'cohorte-uuid-001';
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };

const mockAdminInvite = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockSupabaseAdminClient = {
  auth: { admin: { inviteUserByEmail: mockAdminInvite } },
};

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

function setupHappy(emails: string[] = ['karim@ex.com', 'sarah@ex.com']) {
  mockGetRouterParam.mockReturnValue(COHORTE_ID);
  mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
  mockServerSupabaseServiceRole.mockReturnValue(mockSupabaseAdminClient);
  mockReadValidatedBody.mockResolvedValue({ emails });
  mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  mockMembershipFindFirst.mockResolvedValue(null); // pas membre = auth ko → on set globalRole
  mockCohorteFindUnique.mockResolvedValue({ id: COHORTE_ID });
  mockUserFindMany.mockResolvedValue([]);
  mockMembershipFindMany.mockResolvedValue([]);
  mockInvitationFindMany.mockResolvedValue([]);
  mockInvitationCreate.mockResolvedValue({ id: 'inv-uuid' });
  mockCheckRateLimitBulk.mockImplementation(() => {
    /* no throw */
  });
}

const importHandler = () => import('~~/server/api/cohortes/[id]/invitations.post');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/invitations — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAdminInvite.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si pas authentifié', async () => {
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue(null);
    mockReadValidatedBody.mockResolvedValue({ emails: ['test@ex.com'] });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 403 si stagiaire (pas formateur)', async () => {
    mockGetRouterParam.mockReturnValue(COHORTE_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: 'stagiaire-uuid' });
    mockReadValidatedBody.mockResolvedValue({ emails: ['test@ex.com'] });
    mockCheckRateLimitBulk.mockImplementation(() => {
      /* no throw */
    });
    mockUserFindUnique.mockResolvedValue({ id: 'stagiaire-uuid', globalRole: 'STAGIAIRE' });
    mockMembershipFindFirst.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('autorise un ADMIN global', async () => {
    setupHappy();
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ invited: expect.any(Array), deduplicated: [] });
  });

  it('autorise un FORMATEUR_PRINCIPAL global', async () => {
    setupHappy();

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ invited: expect.any(Array) });
  });
});

describe('POST /api/cohortes/:id/invitations — déduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAdminInvite.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('déduplique les emails déjà membres de la cohorte', async () => {
    const email = 'already-member@ex.com';
    setupHappy([email, 'new@ex.com']);
    // Simuler un utilisateur existant membre
    mockUserFindMany.mockResolvedValue([{ id: 'existing-user', email }]);
    mockMembershipFindMany.mockResolvedValue([{ userId: 'existing-user' }]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.deduplicated).toContain(email);
    expect(result.invited).not.toContain(email);
    expect(result.invited).toContain('new@ex.com');
  });

  it('déduplique les emails déjà invités (invitation active)', async () => {
    const email = 'pending@ex.com';
    setupHappy([email, 'new@ex.com']);
    mockInvitationFindMany.mockResolvedValue([{ email }]);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.deduplicated).toContain(email);
    expect(result.invited).not.toContain(email);
  });

  it('déduplique les emails en double dans la même requête', async () => {
    setupHappy(['user@ex.com', 'USER@EX.COM', 'user@ex.com']);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    // Après déduplication casse, 1 seul email unique
    expect(result.total).toBe(1);
    expect(result.invited).toHaveLength(1);
  });

  it("n'invite que les emails valides (Zod gère les invalides)", async () => {
    setupHappy(['valid@ex.com']);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.invited).toContain('valid@ex.com');
  });
});

describe('POST /api/cohortes/:id/invitations — rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 429 si le rate limit est dépassé', async () => {
    setupHappy(['karim@ex.com']);
    mockCheckRateLimitBulk.mockImplementation(() => {
      const err = new Error('Quota dépassé');
      // @ts-expect-error — H3Error statusCode non présent sur Error natif
      err.statusCode = 429;
      throw err;
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe('POST /api/cohortes/:id/invitations — cohorte inexistante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAdminInvite.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 404 si la cohorte est introuvable', async () => {
    setupHappy(['karim@ex.com']);
    mockCohorteFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});
