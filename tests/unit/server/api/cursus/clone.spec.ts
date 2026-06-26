// @vitest-environment node
//
// Tests unitaires pour POST /api/cursus/:id/clone (ST-03.6).
// Handler importé une fois (pas de resetModules entre les tests).
// $transaction est mocké en mode callback (Prisma 7 interactive form).

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ─── Mocks hoistés ────────────────────────────────────────────────────────────

const {
  mockServerSupabaseUser,
  mockUserFindUnique,
  mockCursusFindUnique,
  mockPrismaTransaction,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockCursusFindUnique: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cursus: { findUnique: mockCursusFindUnique },
    $transaction: mockPrismaTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

// Nitro/H3 globals
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn().mockReturnValue('source-cursus-001');
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Handler (imported once) ──────────────────────────────────────────────────

type Handler = (event: unknown) => Promise<unknown>;
let handler: Handler;

beforeAll(async () => {
  const mod = await import('~~/server/api/cursus/[id]/clone.post');
  handler = mod.default as Handler;
});

// ─── Helpers & fixtures ───────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const OWNER = { id: 'owner-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const OTHER_USER = { id: 'other-uuid-999', globalRole: 'STAGIAIRE' };
const ADMIN_USER = { id: 'admin-uuid-111', globalRole: 'ADMIN' };

const QUIZ_ITEM = {
  id: 'quiz-1',
  title: 'Quiz Intro',
  questionsJson: [{ q: 'What is HTML?' }],
  passingScore: 70,
  randomize: true,
};

const MODULE_ITEM = {
  id: 'mod-1',
  week: 1,
  title: 'Intro HTML',
  objectives: 'Learn HTML basics',
  resourcesJson: [],
  deliverableSpecJson: {},
  xpReward: 100,
  badgeId: null,
  quiz: null,
};

const MODULE_WITH_QUIZ = { ...MODULE_ITEM, id: 'mod-2', week: 2, quiz: QUIZ_ITEM };

const SOURCE_CURSUS = {
  id: 'source-cursus-001',
  title: 'Web Dev',
  slug: 'web-dev',
  domain: 'dev-web',
  level: 'BEGINNER',
  durationWeeks: 12,
  description: 'A great course',
  prerequisites: null,
  status: 'DRAFT',
  ownerId: OWNER.id,
  modules: [MODULE_ITEM],
};

const PUBLISHED_CURSUS = { ...SOURCE_CURSUS, status: 'PUBLISHED' };
const ARCHIVED_CURSUS = { ...SOURCE_CURSUS, status: 'ARCHIVED' };

/** Construit un mock de client de transaction Prisma. */
function makeTxClient(overrides?: { newCursusId?: string; quizId?: string }) {
  const newCursusId = overrides?.newCursusId ?? 'clone-cursus-001';
  const newQuizId = overrides?.quizId ?? 'new-quiz-001';

  const mockCursusCreate = vi.fn().mockResolvedValue({ id: newCursusId, title: 'Web Dev (copie)' });
  const mockQuizCreate = vi.fn().mockResolvedValue({ id: newQuizId });
  const mockModuleCreate = vi.fn().mockResolvedValue({ id: 'new-mod-001' });
  const mockCursusFindUniqueOrThrow = vi.fn().mockResolvedValue({
    id: newCursusId,
    title: 'Web Dev (copie)',
    status: 'DRAFT',
    _count: { modules: 1, versions: 0 },
    versions: [],
  });

  const tx = {
    cursus: {
      create: mockCursusCreate,
      findUniqueOrThrow: mockCursusFindUniqueOrThrow,
    },
    quiz: { create: mockQuizCreate },
    module: { create: mockModuleCreate },
  };

  return { tx, mockCursusCreate, mockQuizCreate, mockModuleCreate, mockCursusFindUniqueOrThrow };
}

// ─── Authentication & Authorization ──────────────────────────────────────────

describe('POST /api/cursus/:id/clone — authentication & authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 400 when cursus id is missing from route', async () => {
    mockGetRouterParam.mockReturnValue(undefined);
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when cursus does not exist', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(null);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when caller is not the owner and not ADMIN', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER_USER.id });
    mockUserFindUnique.mockResolvedValue(OTHER_USER);
    mockCursusFindUnique.mockResolvedValue(SOURCE_CURSUS);

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to clone a cursus they do not own', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockCursusFindUnique.mockResolvedValue(SOURCE_CURSUS);

    const { tx } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('POST /api/cursus/:id/clone — happy path', () => {
  let txMock: ReturnType<typeof makeTxClient>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue(SOURCE_CURSUS);

    txMock = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txMock.tx));
  });

  it('returns the new cursus with status DRAFT', async () => {
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });

  it('calls $transaction exactly once', async () => {
    await handler(makeEvent());
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });

  it('creates the new cursus with title suffixed by " (copie)"', async () => {
    await handler(makeEvent());

    expect(txMock.mockCursusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Web Dev (copie)' }),
      }),
    );
  });

  it('sets the new cursus status to DRAFT regardless of source status', async () => {
    await handler(makeEvent());

    expect(txMock.mockCursusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
  });

  it('sets owner to the calling user', async () => {
    await handler(makeEvent());

    expect(txMock.mockCursusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: OWNER.id }),
      }),
    );
  });

  it('creates one module for each module in the source', async () => {
    await handler(makeEvent());
    expect(txMock.mockModuleCreate).toHaveBeenCalledTimes(1);
  });

  it('copies module fields from source', async () => {
    await handler(makeEvent());

    expect(txMock.mockModuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          week: MODULE_ITEM.week,
          title: MODULE_ITEM.title,
          objectives: MODULE_ITEM.objectives,
          xpReward: MODULE_ITEM.xpReward,
        }),
      }),
    );
  });

  it('does NOT copy quiz when the source module has no quiz', async () => {
    await handler(makeEvent());
    expect(txMock.mockQuizCreate).not.toHaveBeenCalled();
  });

  it('fetches the clone with _count and versions after creation', async () => {
    await handler(makeEvent());

    expect(txMock.mockCursusFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clone-cursus-001' },
      }),
    );
  });
});

// ─── Quiz deep-copy ───────────────────────────────────────────────────────────

describe('POST /api/cursus/:id/clone — quiz deep-copy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
    mockCursusFindUnique.mockResolvedValue({
      ...SOURCE_CURSUS,
      modules: [MODULE_WITH_QUIZ],
    });
  });

  it('creates a new quiz when source module has a quiz', async () => {
    const { tx, mockQuizCreate } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await handler(makeEvent());

    expect(mockQuizCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: QUIZ_ITEM.title,
          passingScore: QUIZ_ITEM.passingScore,
          randomize: QUIZ_ITEM.randomize,
        }),
      }),
    );
  });

  it('links the new quiz id to the new module', async () => {
    const { tx, mockModuleCreate } = makeTxClient({ quizId: 'new-quiz-999' });
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await handler(makeEvent());

    expect(mockModuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quizId: 'new-quiz-999' }),
      }),
    );
  });
});

// ─── Title truncation ─────────────────────────────────────────────────────────

describe('POST /api/cursus/:id/clone — title truncation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
  });

  it('truncates title + suffix to max 200 chars', async () => {
    // 198 chars title — 'Web Dev (copie)' would be 198+8=206 > 200
    const longTitle = 'A'.repeat(198);
    mockCursusFindUnique.mockResolvedValue({
      ...SOURCE_CURSUS,
      title: longTitle,
      modules: [],
    });

    const { tx, mockCursusCreate } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0] as { data?: { title?: string } };
    expect(createCall?.data?.title?.length).toBeLessThanOrEqual(200);
    expect(createCall?.data?.title).toMatch(/\(copie\)$/);
  });

  it('keeps title as-is when title + suffix is within 200 chars', async () => {
    mockCursusFindUnique.mockResolvedValue({
      ...SOURCE_CURSUS,
      title: 'Short',
      modules: [],
    });

    const { tx, mockCursusCreate } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await handler(makeEvent());

    const createCall = mockCursusCreate.mock.calls[0]?.[0] as { data?: { title?: string } };
    expect(createCall?.data?.title).toBe('Short (copie)');
  });
});

// ─── Published & Archived source cursus ──────────────────────────────────────

describe('POST /api/cursus/:id/clone — any source status is allowed', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
  });

  it.each([
    ['DRAFT', SOURCE_CURSUS],
    ['PUBLISHED', PUBLISHED_CURSUS],
    ['ARCHIVED', ARCHIVED_CURSUS],
  ])('clones a %s cursus into a new DRAFT', async (_status, sourceCursus) => {
    mockCursusFindUnique.mockResolvedValue(sourceCursus);

    const { tx } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'DRAFT' });
  });
});

// ─── Multiple modules ─────────────────────────────────────────────────────────

describe('POST /api/cursus/:id/clone — multiple modules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(undefined);
    mockGetRouterParam.mockReturnValue('source-cursus-001');
    mockServerSupabaseUser.mockResolvedValue({ id: OWNER.id });
    mockUserFindUnique.mockResolvedValue(OWNER);
  });

  it('creates one module per source module', async () => {
    const multiModules = Array.from({ length: 5 }, (_, i) => ({
      ...MODULE_ITEM,
      id: `mod-${String(i + 1)}`,
      week: i + 1,
      quiz: null,
    }));
    mockCursusFindUnique.mockResolvedValue({ ...SOURCE_CURSUS, modules: multiModules });

    const { tx, mockModuleCreate } = makeTxClient();
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await handler(makeEvent());

    expect(mockModuleCreate).toHaveBeenCalledTimes(5);
  });
});
