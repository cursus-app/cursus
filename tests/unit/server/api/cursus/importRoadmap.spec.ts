// @vitest-environment node
//
// Tests unitaires pour POST /api/cursus/:id/import-roadmap (ST-03.7).
// Tests du parser (Zod), attribution CC BY-SA 4.0, et comportement du handler.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCursusFindUnique = vi.fn();
const mockModuleAggregate = vi.fn();
const mockModuleDeleteMany = vi.fn();
const mockModuleCreateMany = vi.fn();
const mockCursusUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique, update: mockCursusUpdate },
    module: {
      aggregate: mockModuleAggregate,
      deleteMany: mockModuleDeleteMany,
      createMany: mockModuleCreateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
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

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const CURSUS_ID = 'cursus-uuid-001';
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const CURSUS = {
  id: CURSUS_ID,
  ownerId: FORMATEUR_USER.id,
  status: 'DRAFT',
  description: null,
  _count: { modules: 0 },
};

const VALID_CONCEPTS = [
  { title: 'HTML', url: 'https://roadmap.sh/frontend' },
  { title: 'CSS', url: 'https://roadmap.sh/frontend' },
  { title: 'JavaScript' },
];

const importHandler = () => import('~~/server/api/cursus/[id]/import-roadmap.post');

// ─── Tests : Authentification ─────────────────────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 400 when cursus id is missing', async () => {
    mockGetRouterParam.mockReturnValue(null);
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── Tests : Autorisation ────────────────────────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 404 when cursus not found', async () => {
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when user is not owner or admin', async () => {
    const otherUser = { id: 'other-user-uuid', globalRole: 'FORMATEUR_PRINCIPAL' };
    mockUserFindUnique.mockResolvedValue(otherUser);
    mockCursusFindUnique.mockResolvedValue(CURSUS);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 422 when cursus is ARCHIVED', async () => {
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, status: 'ARCHIVED' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('allows ADMIN to import into any cursus', async () => {
    const admin = { id: 'admin-uuid', globalRole: 'ADMIN' };
    mockServerSupabaseUser.mockResolvedValue({ id: admin.id });
    mockUserFindUnique.mockResolvedValue(admin);
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, ownerId: 'someone-else' });
    mockReadValidatedBody.mockResolvedValue({
      concepts: VALID_CONCEPTS,
      mode: 'replace',
    });
    mockTransaction.mockImplementation(async (fn) => {
      return fn({
        module: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn() },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ created: VALID_CONCEPTS.length });
  });
});

// ─── Tests : Import depuis le catalogue ──────────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — catalog import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports frontend roadmap from catalog', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'frontend', mode: 'replace' });

    let capturedCreateMany: unknown[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
            capturedCreateMany = data;
            return Promise.resolve();
          }),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.roadmapTitle).toBe('Frontend Developer');
    expect(result.sourceUrl).toBe('https://roadmap.sh/frontend');
    expect(result.created).toBeGreaterThan(0);
    expect(capturedCreateMany.length).toBe(result.created);
  });

  it('imports backend roadmap from catalog', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'backend', mode: 'replace' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.roadmapTitle).toBe('Backend Developer');
    expect(result.created).toBeGreaterThan(0);
  });

  it('imports devops roadmap from catalog', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'devops', mode: 'replace' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.roadmapTitle).toBe('DevOps Engineer');
    expect(result.created).toBeGreaterThan(0);
  });

  it('imports cybersecurity roadmap from catalog', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'cybersecurity', mode: 'replace' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.roadmapTitle).toBe('Cybersecurity Expert');
    expect(result.created).toBeGreaterThan(0);
  });

  it('imports ai-data-scientist roadmap from catalog', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'ai-data-scientist', mode: 'replace' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.roadmapTitle).toBe('AI & Data Science');
    expect(result.created).toBeGreaterThan(0);
  });

  it('throws 422 when roadmapId is unknown', async () => {
    mockReadValidatedBody.mockResolvedValue({ roadmapId: 'unknown-roadmap', mode: 'replace' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });
});

// ─── Tests : Import personnalisé (concepts) ───────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — custom concepts import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue(CURSUS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports custom concepts and creates one module per concept', async () => {
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    let capturedData: unknown[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
            capturedData = data;
            return Promise.resolve();
          }),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.created).toBe(VALID_CONCEPTS.length);
    expect(capturedData).toHaveLength(VALID_CONCEPTS.length);
  });

  it('assigns sequential week numbers starting at 1', async () => {
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    let capturedData: Array<{ week: number }> = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockImplementation(({ data }: { data: Array<{ week: number }> }) => {
            capturedData = data;
            return Promise.resolve();
          }),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const weeks = capturedData.map((m) => m.week);
    expect(weeks).toEqual([1, 2, 3]);
  });

  it('stores roadmapUrl in resourcesJson when concept has url', async () => {
    mockReadValidatedBody.mockResolvedValue({
      concepts: [{ title: 'HTML', url: 'https://roadmap.sh/frontend' }],
      mode: 'replace',
    });

    let capturedData: Array<{ resourcesJson: unknown }> = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi
            .fn()
            .mockImplementation(({ data }: { data: Array<{ resourcesJson: unknown }> }) => {
              capturedData = data;
              return Promise.resolve();
            }),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const firstModule = capturedData[0];
    expect(firstModule?.resourcesJson).toMatchObject({ roadmapUrl: 'https://roadmap.sh/frontend' });
  });
});

// ─── Tests : Mode replace / append ───────────────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — replace/append mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, _count: { modules: 5 } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes existing modules when mode is replace', async () => {
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    const mockDeleteMany = vi.fn().mockResolvedValue({ count: 5 });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: mockDeleteMany,
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { cursusId: CURSUS_ID } });
    expect(result.deleted).toBe(5);
  });

  it('does not delete modules when mode is append', async () => {
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'append' });
    mockModuleAggregate.mockResolvedValue({ _max: { week: 5 } });

    const mockDeleteMany = vi.fn();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: mockDeleteMany,
          createMany: vi.fn(),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('starts at week max+1 when mode is append', async () => {
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'append' });
    mockModuleAggregate.mockResolvedValue({ _max: { week: 5 } });

    let capturedData: Array<{ week: number }> = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn(),
          createMany: vi.fn().mockImplementation(({ data }: { data: Array<{ week: number }> }) => {
            capturedData = data;
            return Promise.resolve();
          }),
        },
        cursus: { update: vi.fn() },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const weeks = capturedData.map((m) => m.week);
    expect(weeks[0]).toBe(6); // starts at 5 + 1
  });
});

// ─── Tests : Attribution CC BY-SA 4.0 ────────────────────────────────────────

describe('POST /api/cursus/:id/import-roadmap — attribution CC BY-SA 4.0', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(CURSUS_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds attribution when cursus description is empty', async () => {
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, description: null });
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    let capturedUpdateData: unknown = null;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: {
          update: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
            capturedUpdateData = data;
            return Promise.resolve();
          }),
        },
      });
    });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.attribution).toContain('roadmap.sh');
    expect(result.attribution).toContain('CC BY-SA 4.0');
    expect(capturedUpdateData).toMatchObject({
      description: expect.stringContaining('roadmap.sh'),
    });
  });

  it('does not duplicate attribution when already present', async () => {
    const existingDesc = 'Cursus de dev. Inspiré de roadmap.sh (CC BY-SA 4.0) — https://roadmap.sh';
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, description: existingDesc });
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    const mockCursusUpdate = vi.fn();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: { update: mockCursusUpdate },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Attribution already present — update should NOT be called
    expect(mockCursusUpdate).not.toHaveBeenCalled();
  });

  it('appends attribution after existing description', async () => {
    const existingDesc = 'Mon cursus existant.';
    mockCursusFindUnique.mockResolvedValue({ ...CURSUS, description: existingDesc });
    mockReadValidatedBody.mockResolvedValue({ concepts: VALID_CONCEPTS, mode: 'replace' });

    let capturedDescription = '';
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        module: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn(),
        },
        cursus: {
          update: vi.fn().mockImplementation(({ data }: { data: { description: string } }) => {
            capturedDescription = data.description;
            return Promise.resolve();
          }),
        },
      });
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(capturedDescription).toContain(existingDesc);
    expect(capturedDescription).toContain('roadmap.sh');
    expect(capturedDescription.indexOf(existingDesc)).toBeLessThan(
      capturedDescription.indexOf('roadmap.sh'),
    );
  });
});

// ─── Tests : Schéma Zod (importRoadmapSchema) ─────────────────────────────────

describe('importRoadmapSchema — validation Zod', () => {
  it('validates correctly with roadmapId', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ roadmapId: 'frontend' });
    expect(result.success).toBe(true);
  });

  it('validates correctly with concepts array', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({
      concepts: [{ title: 'HTML' }, { title: 'CSS', url: 'https://roadmap.sh/css' }],
    });
    expect(result.success).toBe(true);
  });

  it('fails when neither roadmapId nor concepts provided', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ mode: 'replace' });
    expect(result.success).toBe(false);
  });

  it('strips HTML tags from concept titles (XSS protection)', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({
      concepts: [{ title: '<script>alert("xss")</script>HTML' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const concept = result.data.concepts?.[0];
      // Les balises HTML sont supprimées (prévention XSS — pas d'exécution possible).
      // Le contenu textuel entre les balises est conservé (comportement voulu : les
      // caractères ne sont pas dangereux une fois les balises supprimées).
      expect(concept?.title).not.toContain('<script>');
      expect(concept?.title).not.toContain('</script>');
      // Le titre résultant contient toujours "HTML" (texte visible)
      expect(concept?.title).toContain('HTML');
    }
  });

  it('rejects invalid URLs in concept url field', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({
      concepts: [{ title: 'HTML', url: 'not-a-valid-url' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty concepts array', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ concepts: [] });
    expect(result.success).toBe(false);
  });

  it('rejects concepts with empty title', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ concepts: [{ title: '' }] });
    expect(result.success).toBe(false);
  });

  it('defaults mode to replace when not specified', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ roadmapId: 'frontend' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('replace');
    }
  });

  it('accepts append mode', async () => {
    const { importRoadmapSchema } = await import('~~/shared/schemas/cursus');
    const result = importRoadmapSchema.safeParse({ roadmapId: 'frontend', mode: 'append' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('append');
    }
  });
});

// ─── Tests : Catalogue GET endpoint ──────────────────────────────────────────

describe('GET /api/cursus/import-roadmap/catalog', () => {
  it('returns catalog entries with conceptCount', async () => {
    vi.stubGlobal('defineEventHandler', (fn: () => unknown) => fn);
    const { default: handler } = await import('~~/server/api/cursus/import-roadmap/catalog.get');

    const result = (await (handler as () => Promise<unknown>)()) as Array<{
      id: string;
      conceptCount: number;
    }>;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const frontend = result.find((r) => r.id === 'frontend');
    expect(frontend).toBeDefined();
    expect(frontend?.conceptCount).toBeGreaterThan(0);
  });

  it('includes all expected catalog roadmaps', async () => {
    vi.stubGlobal('defineEventHandler', (fn: () => unknown) => fn);
    const { default: handler } = await import('~~/server/api/cursus/import-roadmap/catalog.get');

    const result = (await (handler as () => Promise<unknown>)()) as Array<{ id: string }>;
    const ids = result.map((r) => r.id);

    expect(ids).toContain('frontend');
    expect(ids).toContain('backend');
    expect(ids).toContain('devops');
    expect(ids).toContain('cybersecurity');
    expect(ids).toContain('ai-data-scientist');
  });

  it('does not expose concepts array in catalog list', async () => {
    vi.stubGlobal('defineEventHandler', (fn: () => unknown) => fn);
    const { default: handler } = await import('~~/server/api/cursus/import-roadmap/catalog.get');

    const result = (await (handler as () => Promise<unknown>)()) as Array<Record<string, unknown>>;
    result.forEach((entry) => {
      expect('concepts' in entry).toBe(false);
    });
  });
});
