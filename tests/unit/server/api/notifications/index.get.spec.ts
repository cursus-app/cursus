// @vitest-environment node
//
// Tests unitaires pour GET /api/notifications (ST-12.1)
// RLS : user ne voit que ses propres notifications.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaNotification = {
  findMany: vi.fn(),
  count: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    notification: mockPrismaNotification,
  },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — propriétés H3Error simulées pour tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);
vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));

const importHandler = () => import('~~/server/api/notifications/index.get');

// ---- Données de test ----

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const USER_B = '550e8400-e29b-41d4-a716-446655440002';

const notifA1 = {
  id: 'notif-a1',
  type: 'BADGE_AWARDED',
  title: 'Badge obtenu !',
  body: 'Tu as gagné le badge Pioneer.',
  readAt: null,
  createdAt: new Date('2026-06-27T10:00:00Z'),
};

const notifA2 = {
  id: 'notif-a2',
  type: 'SUBMISSION_VALIDATED',
  title: 'Livrable validé',
  body: null,
  readAt: new Date('2026-06-27T09:00:00Z'),
  createdAt: new Date('2026-06-27T08:00:00Z'),
};

// ---- Tests ----

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne les notifications paginées avec meta', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findMany.mockResolvedValue([notifA1, notifA2]);
    mockPrismaNotification.count
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(1); // unreadCount

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({
      data: [notifA1, notifA2],
      meta: {
        total: 2,
        unreadCount: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      },
    });
  });

  it('filtre par userId (RLS) — ne voit pas les notifs du USER_B', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findMany.mockResolvedValue([notifA1]);
    mockPrismaNotification.count.mockResolvedValue(0);

    const { default: handler } = await importHandler();
    await handler({});

    const findManyCall = mockPrismaNotification.findMany.mock.calls[0]?.[0];
    expect(findManyCall?.where?.userId).toBe(USER_A);
    expect(findManyCall?.where?.userId).not.toBe(USER_B);
  });

  it('filtre unreadOnly si paramètre présent', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ unreadOnly: 'true' }));
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findMany.mockResolvedValue([notifA1]);
    mockPrismaNotification.count.mockResolvedValue(0);

    const { default: handler } = await importHandler();
    await handler({});

    const findManyCall = mockPrismaNotification.findMany.mock.calls[0]?.[0];
    expect(findManyCall?.where).toMatchObject({ userId: USER_A, readAt: null });
  });

  it('retourne 400 si page invalide', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ page: 'abc' }));
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('plafonne perPage à 100', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ perPage: '200' }));
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });
});
