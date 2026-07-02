// @vitest-environment node
//
// Tests unitaires pour DELETE /api/quizzes/:id — suppression d'un quiz (ST-07.1).
//
// Comportement :
// - 401 si non authentifié.
// - 403 si ni ADMIN ni propriétaire du cursus (isCursusOwner = quiz.module?.cursus?.ownerId === dbUser.id).
// - 404 si le quiz n'existe pas.
// - 409 si le quiz a des tentatives (quiz._count.attempts > 0, via select _count Prisma).
// - Désassocie le module explicitement (module.update quizId → null) si lié, avant suppression.
// - Supprime le quiz et retourne { success: true }.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockQuizFindUnique = vi.fn();
const mockQuizDelete = vi.fn();
const mockModuleUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    quiz: { findUnique: mockQuizFindUnique, delete: mockQuizDelete },
    module: { update: mockModuleUpdate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// Nitro/H3 globals
const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties added for tests
  err.statusCode = opts.statusCode;
  // @ts-expect-error — H3Error properties added for tests
  err.data = opts.data;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const QUIZ_ID = 'quiz-uuid-001';
const MODULE_ID = 'module-uuid-001';
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };

// Quiz without a linked module and no attempts
const QUIZ_NO_MODULE_NO_ATTEMPTS = {
  id: QUIZ_ID,
  module: null,
  _count: { attempts: 0 },
};

// Quiz linked to a module whose cursus is owned by FORMATEUR_USER
const QUIZ_WITH_MODULE_NO_ATTEMPTS = {
  id: QUIZ_ID,
  module: {
    id: MODULE_ID,
    cursus: { ownerId: FORMATEUR_USER.id },
  },
  _count: { attempts: 0 },
};

// Quiz with existing attempts — blocks deletion
const QUIZ_WITH_ATTEMPTS = {
  id: QUIZ_ID,
  module: null,
  _count: { attempts: 2 },
};

const importHandler = () => import('~~/server/api/quizzes/[id].delete');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('DELETE /api/quizzes/:id — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('DELETE /api/quizzes/:id — authorization (ownership-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Quiz with no module link → isCursusOwner is always false for non-null quiz
    mockQuizFindUnique.mockResolvedValue(QUIZ_NO_MODULE_NO_ATTEMPTS);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when user is STAGIAIRE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'stagiaire-id' });
    mockUserFindUnique.mockResolvedValue({ id: 'stagiaire-id', globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when user is FORMATEUR_PRINCIPAL but is not the cursus owner', async () => {
    // Quiz has no linked module → isCursusOwner = false for any non-admin
    mockServerSupabaseUser.mockResolvedValue({ id: 'other-formateur-id' });
    mockUserFindUnique.mockResolvedValue({
      id: 'other-formateur-id',
      globalRole: 'FORMATEUR_PRINCIPAL',
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when user is CO_FORMATEUR and not the cursus owner', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'cofo-id' });
    mockUserFindUnique.mockResolvedValue({ id: 'cofo-id', globalRole: 'CO_FORMATEUR' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── Tests — Not Found ────────────────────────────────────────────────────────

describe('DELETE /api/quizzes/:id — not found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 404 when quiz does not exist', async () => {
    mockQuizFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests — Conflict: existing attempts ─────────────────────────────────────

describe('DELETE /api/quizzes/:id — blocked when attempts exist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 409 when quiz has at least one attempt', async () => {
    mockQuizFindUnique.mockResolvedValue(QUIZ_WITH_ATTEMPTS);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 409 when quiz has many attempts', async () => {
    mockQuizFindUnique.mockResolvedValue({ ...QUIZ_WITH_ATTEMPTS, _count: { attempts: 42 } });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does NOT call quiz.delete when quiz has attempts', async () => {
    mockQuizFindUnique.mockResolvedValue(QUIZ_WITH_ATTEMPTS);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toThrow();
    expect(mockQuizDelete).not.toHaveBeenCalled();
  });
});

// ─── Tests — Successful deletion ─────────────────────────────────────────────

describe('DELETE /api/quizzes/:id — successful deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockQuizDelete.mockResolvedValue({ id: QUIZ_ID });
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls prisma.quiz.delete with the correct id', async () => {
    mockQuizFindUnique.mockResolvedValue(QUIZ_NO_MODULE_NO_ATTEMPTS);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockQuizDelete).toHaveBeenCalledWith({ where: { id: QUIZ_ID } });
  });

  it('returns { success: true } when deletion completes', async () => {
    mockQuizFindUnique.mockResolvedValue(QUIZ_NO_MODULE_NO_ATTEMPTS);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ success: true });
  });

  it('explicitly unlinks quiz from module before deleting when module is attached', async () => {
    // The handler calls module.update({ where: { quizId: id }, data: { quizId: null } })
    // before calling quiz.delete — explicit unlinking, not relying on cascade.
    mockQuizFindUnique.mockResolvedValue(QUIZ_WITH_MODULE_NO_ATTEMPTS);
    mockModuleUpdate.mockResolvedValue({});

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { quizId: QUIZ_ID },
        data: { quizId: null },
      }),
    );
    expect(mockQuizDelete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call module.update when quiz has no linked module', async () => {
    mockQuizFindUnique.mockResolvedValue(QUIZ_NO_MODULE_NO_ATTEMPTS);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).not.toHaveBeenCalled();
  });

  it('allows ADMIN to delete any quiz regardless of cursus ownership', async () => {
    // Admin is always allowed — even when quiz.module.cursus.ownerId !== admin.id
    mockQuizFindUnique.mockResolvedValue(QUIZ_NO_MODULE_NO_ATTEMPTS);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(mockQuizDelete).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true });
  });

  it('allows the cursus owner (FORMATEUR_PRINCIPAL) to delete their quiz', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    // QUIZ_WITH_MODULE_NO_ATTEMPTS has cursus.ownerId === FORMATEUR_USER.id
    mockQuizFindUnique.mockResolvedValue(QUIZ_WITH_MODULE_NO_ATTEMPTS);
    mockModuleUpdate.mockResolvedValue({});

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ success: true });
  });
});
