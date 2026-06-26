// @vitest-environment node
//
// Tests unitaires pour PATCH /api/notifications/:id/read (ST-12.1)
// RLS : user ne peut marquer que ses propres notifications.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaNotification = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: { notification: mockPrismaNotification },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockCreateError = vi.fn(
  (opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message);
    // @ts-expect-error — propriétés H3Error simulées pour tests
    err.statusCode = opts.statusCode;
    return err;
  },
);
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('notif-123'));

const importHandler = () =>
  import('~~/server/api/notifications/[id]/read.patch');

// ---- Tests ----

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const USER_B = '550e8400-e29b-41d4-a716-446655440002';

describe('PATCH /api/notifications/:id/read', () => {
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

  it('retourne 404 si la notification n\'existe pas', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 403 si la notification appartient à un autre user (RLS)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue({
      id: 'notif-123',
      userId: USER_B, // autre user
      readAt: null,
    });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('marque la notification comme lue', async () => {
    const now = new Date();
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue({
      id: 'notif-123',
      userId: USER_A,
      readAt: null,
    });
    mockPrismaNotification.update.mockResolvedValue({
      id: 'notif-123',
      readAt: now,
    });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({ id: 'notif-123', readAt: now });
    expect(mockPrismaNotification.update).toHaveBeenCalledWith({
      where: { id: 'notif-123' },
      data: { readAt: expect.any(Date) },
      select: { id: true, readAt: true },
    });
  });

  it('est idempotent si déjà lue — ne met pas à jour', async () => {
    const readAt = new Date('2026-06-27T09:00:00Z');
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue({
      id: 'notif-123',
      userId: USER_A,
      readAt,
    });

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({ id: 'notif-123', readAt });
    expect(mockPrismaNotification.update).not.toHaveBeenCalled();
  });
});
