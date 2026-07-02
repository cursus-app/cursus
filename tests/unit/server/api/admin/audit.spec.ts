// @vitest-environment node
//
// Tests unitaires pour GET /api/admin/audit — ST-08.4

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockServerSupabaseUser } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock('#supabase/server', () => ({ serverSupabaseUser: mockServerSupabaseUser }));
vi.mock('~~/server/utils/prisma', () => ({ prisma: mockPrisma }));
vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('~~/server/utils/hash', () => ({ hashId: (id: string) => `h:${id}` }));

vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const e = new Error(opts.message) as Error & { statusCode: number };
  e.statusCode = opts.statusCode;
  return e;
});
vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn);
vi.stubGlobal('getValidatedQuery', (_e: unknown, fn: (q: unknown) => unknown) =>
  fn({ limit: '50' }),
);

const ADMIN_USER = { id: 'admin-uuid', globalRole: 'ADMIN' };
const STAGIAIRE_USER = { id: 'stagiaire-uuid', globalRole: 'STAGIAIRE' };

const AUDIT_ENTRIES = [
  {
    id: 'entry-1',
    action: 'submission.override.validate',
    entityType: 'Submission',
    entityId: 'sub-uuid',
    diff: null,
    metadata: { reason: 'Good work' },
    ipAddress: '10.0.0.0',
    userAgent: 'curl/7.0',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    actor: { id: 'actor-uuid', fullName: 'Alice F.' },
  },
];

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

async function importHandler() {
  const mod = await import('~~/server/api/admin/audit.get');
  return mod.default;
}

describe('GET /api/admin/audit — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('throws 401 when not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const handler = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('GET /api/admin/audit — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('throws 404 when user profile not found', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const handler = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 for non-admin user', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_USER.id });
    mockPrisma.user.findUnique.mockResolvedValue(STAGIAIRE_USER);

    const handler = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to access audit log', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockPrisma.user.findUnique.mockResolvedValue(ADMIN_USER);
    mockPrisma.auditLog.findMany.mockResolvedValue(AUDIT_ENTRIES);

    const handler = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ items: AUDIT_ENTRIES, nextCursor: null });
  });
});

describe('GET /api/admin/audit — pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockPrisma.user.findUnique.mockResolvedValue(ADMIN_USER);
  });

  it('returns nextCursor when more items exist', async () => {
    // Return limit+1 items to signal hasMore
    const items = Array.from({ length: 51 }, (_, i) => ({
      ...AUDIT_ENTRIES[0],
      id: `entry-${i}`,
    }));
    mockPrisma.auditLog.findMany.mockResolvedValue(items);

    const handler = await importHandler();
    const result = await handler(makeEvent());

    expect(result.items).toHaveLength(50);
    expect(result.nextCursor).toBe('entry-49');
  });

  it('returns null nextCursor when no more items', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue(AUDIT_ENTRIES);

    const handler = await importHandler();
    const result = await handler(makeEvent());

    expect(result.nextCursor).toBeNull();
  });
});

describe('GET /api/admin/audit — filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockPrisma.user.findUnique.mockResolvedValue(ADMIN_USER);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
  });

  it('passes actorId filter to prisma', async () => {
    vi.stubGlobal('getValidatedQuery', (_e: unknown, fn: (q: unknown) => unknown) =>
      fn({ actorId: '00000000-0000-0000-0000-000000000001', limit: '50' }),
    );

    const handler = await importHandler();
    await handler(makeEvent());

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorId: '00000000-0000-0000-0000-000000000001' }),
      }),
    );
  });

  it('passes action filter to prisma', async () => {
    vi.stubGlobal('getValidatedQuery', (_e: unknown, fn: (q: unknown) => unknown) =>
      fn({ action: 'override', limit: '50' }),
    );

    const handler = await importHandler();
    await handler(makeEvent());

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: { contains: 'override' } }),
      }),
    );
  });

  it('passes entityType filter to prisma', async () => {
    vi.stubGlobal('getValidatedQuery', (_e: unknown, fn: (q: unknown) => unknown) =>
      fn({ entityType: 'Submission', limit: '50' }),
    );

    const handler = await importHandler();
    await handler(makeEvent());

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityType: 'Submission' }),
      }),
    );
  });

  it('passes from/to date range filter to prisma', async () => {
    vi.stubGlobal('getValidatedQuery', (_e: unknown, fn: (q: unknown) => unknown) =>
      fn({ from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z', limit: '50' }),
    );

    const handler = await importHandler();
    await handler(makeEvent());

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: new Date('2026-01-01T00:00:00Z'),
            lte: new Date('2026-12-31T23:59:59Z'),
          }),
        }),
      }),
    );
  });
});
