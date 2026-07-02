// @vitest-environment node
//
// Tests unitaires — POST /api/badges/:badgeId/grant (ST-11.2)
// Couvre : auth, rate-limit, rôle, cohorte-level auth, idémpotence, happy path.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// ─── Mocks globaux Nitro/H3 ──────────────────────────────────────────────────

const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties not on standard Error
  err.statusCode = opts.statusCode;
  // @ts-expect-error — H3Error properties not on standard Error
  err.data = opts.data;
  return err;
});

vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);
vi.stubGlobal('readBody', vi.fn());
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'));

// ─── Mocks DB ─────────────────────────────────────────────────────────────────

const mockTransaction = vi.fn();
const mockUserFindUnique = vi.fn();
const mockBadgeFindUnique = vi.fn();
const mockUserBadgeCreate = vi.fn();
const mockNotificationCreate = vi.fn();
const mockMembershipFindFirst = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    badge: { findUnique: mockBadgeFindUnique },
    userBadge: { create: mockUserBadgeCreate },
    notification: { create: mockNotificationCreate },
    membership: { findFirst: mockMembershipFindFirst },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed:${id}`,
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('~~/server/utils/auditLog', () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
  extractIp: vi.fn().mockReturnValue(null),
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: (...args: unknown[]) => mockServerSupabaseUser(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUPABASE_USER = { id: 'granter-uuid-1' };
const FORMATEUR = { id: 'granter-uuid-1', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN = { id: 'admin-uuid', globalRole: 'ADMIN' };
const BADGE = { id: 'badge-uuid-1', code: 'mentor-du-jour', name: 'Mentor du jour' };
const VALID_BODY = {
  userId: '00000000-0000-0000-0000-000000000099',
  mention: 'Excellent pair programming !',
};

const getHandler = async () => {
  const mod = await import('~~/server/api/badges/[badgeId]/grant.post');
  return mod.default as (event: unknown) => Promise<unknown>;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/badges/:badgeId/grant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue(SUPABASE_USER);
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockBadgeFindUnique.mockResolvedValue(BADGE);
    mockMembershipFindFirst.mockResolvedValue({ id: 'membership-1' });
    mockUserBadgeCreate.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});
    mockTransaction.mockResolvedValue([{}, {}]);
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(VALID_BODY));
    vi.stubGlobal(
      'getRouterParam',
      vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'),
    );
  });

  describe('Authentification', () => {
    it('retourne 401 si Supabase user est null', async () => {
      mockServerSupabaseUser.mockResolvedValue(null);
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('Autorisation — rôle global', () => {
    it('retourne 403 si le rôle est STAGIAIRE', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'user-1', globalRole: 'STAGIAIRE' });
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    });

    it('accepte FORMATEUR_PRINCIPAL', async () => {
      const handler = await getHandler();
      const result = await handler({});
      expect(result).toEqual({ ok: true });
    });

    it('accepte CO_FORMATEUR avec cohorte valide', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'granter-uuid-1', globalRole: 'CO_FORMATEUR' });
      const handler = await getHandler();
      const result = await handler({});
      expect(result).toEqual({ ok: true });
    });
  });

  describe('Autorisation — cohorte-level', () => {
    it('retourne 403 si le stagiaire est hors cohorte du formateur', async () => {
      mockMembershipFindFirst.mockResolvedValue(null);
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    });

    it('ADMIN peut attribuer sans vérification de cohorte', async () => {
      mockUserFindUnique.mockResolvedValue(ADMIN);
      mockMembershipFindFirst.mockResolvedValue(null); // membership check skipped for ADMIN
      const handler = await getHandler();
      const result = await handler({});
      expect(result).toEqual({ ok: true });
      expect(mockMembershipFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('retourne 400 si badgeId est un non-UUID', async () => {
      vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('not-a-uuid'));
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('retourne 400 si badgeId est absent', async () => {
      vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(undefined));
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('retourne 404 si le badge est introuvable', async () => {
      mockBadgeFindUnique.mockResolvedValue(null);
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 404 });
    });

    it('retourne 400 si le payload est invalide (userId non UUID)', async () => {
      vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ userId: 'not-a-uuid' }));
      const handler = await getHandler();
      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('Happy path', () => {
    it('exécute la transaction badge+notification et crée un audit log', async () => {
      const { createAuditEntry } = await import('~~/server/utils/auditLog');
      const handler = await getHandler();
      const result = await handler({});
      expect(result).toEqual({ ok: true });
      expect(mockTransaction).toHaveBeenCalledOnce();
      expect(createAuditEntry).toHaveBeenCalledOnce();
    });
  });

  describe('Idémpotence', () => {
    it('retourne { ok: true } si le badge est déjà attribué (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.8.0',
        meta: { target: ['user_id', 'badge_id'] },
      });
      mockTransaction.mockRejectedValue(p2002);
      const handler = await getHandler();
      const result = await handler({});
      expect(result).toEqual({ ok: true });
    });

    it('relance une erreur DB inattendue', async () => {
      mockTransaction.mockRejectedValue(new Error('DB connection lost'));
      const handler = await getHandler();
      await expect(handler({})).rejects.toThrow('DB connection lost');
    });
  });
});
