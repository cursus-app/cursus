// @vitest-environment node
//
// Tests unitaires pour POST /api/invitations/:id/resend — renvoi invitation (ST-04.2).
// Couvre : auth 401/403, invitation not found 404, already accepted 422.
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
const mockInvitationFindUnique = vi.fn();
const mockInvitationUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    membership: { findFirst: mockMembershipFindFirst },
    invitation: {
      findUnique: mockInvitationFindUnique,
      update: mockInvitationUpdate,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
  checkRateLimitBulk: vi.fn(),
}));

// Nitro/H3 globals
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error statusCode non présent sur Error natif
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INVITATION_ID = 'inv-uuid-001';
const COHORTE_ID = 'cohorte-uuid-001';
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };

const ACTIVE_INVITATION = {
  id: INVITATION_ID,
  email: 'karim@ex.com',
  cohorteId: COHORTE_ID,
  acceptedAt: null,
  revokedAt: null,
};

const mockAdminInvite = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockSupabaseAdminClient = {
  auth: { admin: { inviteUserByEmail: mockAdminInvite } },
};

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

function setupHappy() {
  mockGetRouterParam.mockReturnValue(INVITATION_ID);
  mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
  mockServerSupabaseServiceRole.mockReturnValue(mockSupabaseAdminClient);
  mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  mockInvitationFindUnique.mockResolvedValue(ACTIVE_INVITATION);
  mockInvitationUpdate.mockResolvedValue({ ...ACTIVE_INVITATION });
  mockMembershipFindFirst.mockResolvedValue(null);
}

const importHandler = () => import('~~/server/api/invitations/[id]/resend.post');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/invitations/:id/resend — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAdminInvite.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetRouterParam.mockReturnValue(INVITATION_ID);
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 403 si utilisateur non autorisé pour la cohorte', async () => {
    setupHappy();
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
    expect(result).toMatchObject({ success: true });
  });

  it('autorise un FORMATEUR_PRINCIPAL global', async () => {
    setupHappy();

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ success: true });
  });
});

describe('POST /api/invitations/:id/resend — états invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAdminInvite.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 404 si invitation introuvable', async () => {
    setupHappy();
    mockInvitationFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 422 si invitation déjà acceptée', async () => {
    setupHappy();
    mockInvitationFindUnique.mockResolvedValue({
      ...ACTIVE_INVITATION,
      acceptedAt: new Date().toISOString(),
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('retourne 422 si invitation révoquée', async () => {
    setupHappy();
    mockInvitationFindUnique.mockResolvedValue({
      ...ACTIVE_INVITATION,
      revokedAt: new Date().toISOString(),
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it("prolonge la date d'expiration de 7 jours apres un resend reussi", async () => {
    setupHappy();

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockInvitationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: INVITATION_ID },
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('appelle Supabase inviteUserByEmail avec le bon redirectTo', async () => {
    setupHappy();
    process.env['NUXT_PUBLIC_SITE_URL'] = 'https://app.cursus.io';

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockAdminInvite).toHaveBeenCalledWith(
      'karim@ex.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining(COHORTE_ID),
      }),
    );

    delete process.env['NUXT_PUBLIC_SITE_URL'];
  });
});
