// @vitest-environment node
//
// Tests unitaires pour DELETE /api/notifications/:id (ST-12.1)
// RLS : user ne peut supprimer que ses propres notifications.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaNotification = {
  findUnique: vi.fn(),
  delete: vi.fn(),
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
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('notif-abc'));

const importHandler = () => import('~~/server/api/notifications/[id].delete');

// ---- Tests ----

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const USER_B = '550e8400-e29b-41d4-a716-446655440002';

describe('DELETE /api/notifications/:id', () => {
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

  it("retourne 404 si la notification n'existe pas", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 403 si la notification appartient à un autre user (RLS)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue({
      id: 'notif-abc',
      userId: USER_B,
    });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('supprime la notification et retourne { deleted: true }', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: USER_A });
    mockPrismaNotification.findUnique.mockResolvedValue({
      id: 'notif-abc',
      userId: USER_A,
    });
    mockPrismaNotification.delete.mockResolvedValue({});

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toEqual({ deleted: true });
    expect(mockPrismaNotification.delete).toHaveBeenCalledWith({
      where: { id: 'notif-abc' },
    });
  });
});
