// @vitest-environment node
//
// Tests unitaires pour PATCH /api/notifications/read-all (ST-12.1)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaNotification = {
  updateMany: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: { notification: mockPrismaNotification },
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

const importHandler = () => import('~~/server/api/notifications/read-all.patch');

// ---- Tests ----

const USER_A = '550e8400-e29b-41d4-a716-446655440001';

describe('PATCH /api/notifications/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('marque toutes les notifs non lues comme lues', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.updateMany.mockResolvedValue({ count: 3 });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ markedRead: 3 });
    expect(mockPrismaNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_A, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('retourne 0 si toutes déjà lues', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.updateMany.mockResolvedValue({ count: 0 });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ markedRead: 0 });
  });
});
