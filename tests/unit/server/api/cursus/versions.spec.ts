// @vitest-environment node
//
// Tests unitaires pour GET /api/cursus/:id/versions (ST-03.5).
// Handler importé en lazy-import pour isoler chaque fichier de handler.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks hoistés ────────────────────────────────────────────────────────────

const {
  mockServerSupabaseUser,
  mockUserFindUnique,
  mockCursusFindUnique,
  mockCursusVersionFindMany,
  mockCursusVersionFindUnique,
} = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockCursusFindUnique: vi.fn(),
  mockCursusVersionFindMany: vi.fn(),
  mockCursusVersionFindUnique: vi.fn(),
}));

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    cursusVersion: {
      findMany: mockCursusVersionFindMany,
      findUnique: mockCursusVersionFindUnique,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hash:${id}`,
}));

// ─── H3 / Nitro globals ───────────────────────────────────────────────────────

vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER = { id: 'owner-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN = { id: 'admin-uuid', globalRole: 'ADMIN' };
const OTHER = { id: 'other-uuid', globalRole: 'STAGIAIRE' };

const CURSUS = { id: 'cursus-uuid-001', ownerId: OWNER.id };

const SNAPSHOT_JSON = {
  title: 'Web Dev',
  modules: [
    { id: 'mod-1', week: 1, title: 'HTML', objectives: 'Learn HTML', xpReward: 100 },
    { id: 'mod-2', week: 2, title: 'CSS', objectives: 'Learn CSS', xpReward: 150 },
  ],
};

const VERSIONS_DB = [
  {
    id: 'ver-uuid-002',
    version: 2,
    publishedAt: new Date('2026-03-01'),
    snapshotJson: SNAPSHOT_JSON,
  },
  {
    id: 'ver-uuid-001',
    version: 1,
    publishedAt: new Date('2026-01-01'),
    snapshotJson: { ...SNAPSHOT_JSON, modules: [SNAPSHOT_JSON.modules[0]] },
  },
];

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

// ─── Tests : GET /api/cursus/:id/versions (index) ────────────────────────────

describe('GET /api/cursus/:id/versions — auth guard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRouterParam.mockImplementation((_, key: string) =>
      key === 'id' ? 'cursus-uuid-001' : undefined,
    );
  });

  it('throws 400 when cursus id is missing', async () => {
    mockGetRouterParam.mockReturnValue(undefined);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when cursus does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(null);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when user is not owner and not admin', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER.id });
    mockUserFindUnique.mockResolvedValue(OTHER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('GET /api/cursus/:id/versions — happy path', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRouterParam.mockImplementation((_, key: string) =>
      key === 'id' ? 'cursus-uuid-001' : undefined,
    );
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
    mockCursusVersionFindMany.mockResolvedValue(VERSIONS_DB);
  });

  it('returns a list ordered by version desc', async () => {
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    const result = await handler(makeEvent());
    expect(Array.isArray(result)).toBe(true);
    const list = result as Array<{ version: number }>;
    expect(list[0]?.version).toBe(2);
    expect(list[1]?.version).toBe(1);
  });

  it('derives moduleCount from snapshotJson.modules', async () => {
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    const result = (await handler(makeEvent())) as Array<{ moduleCount: number; version: number }>;
    const v2 = result.find((v) => v.version === 2);
    expect(v2?.moduleCount).toBe(2);
    const v1 = result.find((v) => v.version === 1);
    expect(v1?.moduleCount).toBe(1);
  });

  it('allows ADMIN to list versions of a cursus they do not own', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN.id });
    mockUserFindUnique.mockResolvedValue(ADMIN);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/index.get');
    const result = await handler(makeEvent());
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Tests : GET /api/cursus/:id/versions/:versionId ─────────────────────────

describe('GET /api/cursus/:id/versions/:versionId — auth guard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRouterParam.mockImplementation((_, key: string) => {
      if (key === 'id') {
        return 'cursus-uuid-001';
      }
      if (key === 'versionId') {
        return 'ver-uuid-001';
      }
      return undefined;
    });
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/[versionId].get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 when user is not owner and not admin', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER.id });
    mockUserFindUnique.mockResolvedValue(OTHER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/[versionId].get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('GET /api/cursus/:id/versions/:versionId — happy path', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRouterParam.mockImplementation((_, key: string) => {
      if (key === 'id') {
        return 'cursus-uuid-001';
      }
      if (key === 'versionId') {
        return 'ver-uuid-001';
      }
      return undefined;
    });
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
  });

  it('returns the full version record including snapshotJson', async () => {
    const fullVersion = {
      id: 'ver-uuid-001',
      cursusId: 'cursus-uuid-001',
      version: 1,
      publishedAt: new Date('2026-01-01'),
      snapshotJson: SNAPSHOT_JSON,
    };
    mockCursusVersionFindUnique.mockResolvedValue(fullVersion);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/[versionId].get');
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: 'ver-uuid-001', snapshotJson: SNAPSHOT_JSON });
  });

  it('throws 404 when version does not exist', async () => {
    mockCursusVersionFindUnique.mockResolvedValue(null);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/[versionId].get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when versionId belongs to a different cursus', async () => {
    const wrongCursusVersion = {
      id: 'ver-uuid-001',
      cursusId: 'different-cursus-uuid',
      version: 1,
      publishedAt: new Date(),
      snapshotJson: SNAPSHOT_JSON,
    };
    mockCursusVersionFindUnique.mockResolvedValue(wrongCursusVersion);
    const { default: handler } = await import('~~/server/api/cursus/[id]/versions/[versionId].get');
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});
