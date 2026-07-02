// @vitest-environment node
//
// Tests unitaires pour PATCH /api/quizzes/:id — mise à jour d'un quiz (ST-07.1).
//
// Autorisation : ADMIN (toujours) ou FORMATEUR_PRINCIPAL propriétaire du cursus.
// Les tentatives sont comptées via prisma.quizAttempt.count (appel séparé).
// Warning logué si attemptCount > 0, mais la mise à jour n'est pas bloquée.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockQuizFindUnique = vi.fn();
const mockQuizUpdate = vi.fn();
const mockQuizAttemptCount = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    quiz: { findUnique: mockQuizFindUnique, update: mockQuizUpdate },
    quizAttempt: { count: mockQuizAttemptCount },
  },
}));

// Capture logger.warn to assert it is called for the attempts warning
const mockLoggerWarn = vi.fn();
vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() },
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

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const QUIZ_ID = 'quiz-uuid-001';
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };

// Quiz owned by FORMATEUR_USER's cursus
const EXISTING_QUIZ = {
  id: QUIZ_ID,
  module: { cursus: { ownerId: FORMATEUR_USER.id } },
};
// Quiz owned by a different formateur (for 403 test)
const QUIZ_OWNED_BY_OTHER = {
  id: QUIZ_ID,
  module: { cursus: { ownerId: 'other-formateur-uuid' } },
};

const MCQ_QUESTIONS = [
  {
    id: 'q-001',
    type: 'mcq',
    text: 'Which framework uses the Composition API?',
    options: [
      { id: 'opt-001', text: 'Vue.js', isCorrect: true },
      { id: 'opt-002', text: 'React', isCorrect: false },
    ],
    explanation: '',
  },
];

const UPDATE_BODY = {
  title: 'Introduction au Dev Web — v2',
  questions: MCQ_QUESTIONS,
  passingScore: 80,
};

const UPDATED_QUIZ = {
  id: QUIZ_ID,
  title: UPDATE_BODY.title,
  questionsJson: MCQ_QUESTIONS,
  passingScore: 80,
  randomize: false,
  updatedAt: new Date('2026-07-02T00:00:00Z'),
};

const importHandler = () => import('~~/server/api/quizzes/[id].patch');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('PATCH /api/quizzes/:id — authentication', () => {
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

// ─── Tests — Not Found ────────────────────────────────────────────────────────

describe('PATCH /api/quizzes/:id — not found', () => {
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

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('PATCH /api/quizzes/:id — authorization (role-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockQuizFindUnique.mockResolvedValue(EXISTING_QUIZ);
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

  it('throws 403 when user is CO_FORMATEUR', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'cofo-id' });
    mockUserFindUnique.mockResolvedValue({ id: 'cofo-id', globalRole: 'CO_FORMATEUR' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when FORMATEUR_PRINCIPAL does not own the cursus', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockQuizFindUnique.mockResolvedValue(QUIZ_OWNED_BY_OTHER);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to patch any quiz regardless of ownership', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockQuizFindUnique.mockResolvedValue(QUIZ_OWNED_BY_OTHER);
    mockQuizAttemptCount.mockResolvedValue(0);
    mockReadValidatedBody.mockResolvedValue(UPDATE_BODY);
    mockQuizUpdate.mockResolvedValue(UPDATED_QUIZ);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: QUIZ_ID });
  });
});

// ─── Tests — Body validation ──────────────────────────────────────────────────

describe('PATCH /api/quizzes/:id — body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockQuizFindUnique.mockResolvedValue(EXISTING_QUIZ);
    mockQuizAttemptCount.mockResolvedValue(0);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 400 when updated questions violate the no-correct-answer constraint', async () => {
    const validationError = Object.assign(new Error('quiz.errors.atLeastOneCorrectAnswer'), {
      statusCode: 400,
    });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when body fails schema validation', async () => {
    const validationError = Object.assign(new Error('Body validation failed'), { statusCode: 400 });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── Tests — Existing attempts warning ───────────────────────────────────────

describe('PATCH /api/quizzes/:id — existing attempts warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockQuizFindUnique.mockResolvedValue(EXISTING_QUIZ);
    mockReadValidatedBody.mockResolvedValue(UPDATE_BODY);
    mockQuizUpdate.mockResolvedValue(UPDATED_QUIZ);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits logger.warn when quiz has existing attempts', async () => {
    mockQuizAttemptCount.mockResolvedValue(3);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ quizId: QUIZ_ID, attemptCount: 3 }),
      'quiz.update.existingAttempts',
    );
  });

  it('still completes the update when attempts exist (warn, not block)', async () => {
    mockQuizAttemptCount.mockResolvedValue(5);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(mockQuizUpdate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: QUIZ_ID });
  });

  it('does NOT emit the attempts logger.warn when quiz has zero attempts', async () => {
    mockQuizAttemptCount.mockResolvedValue(0);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    const attemptWarnCall = mockLoggerWarn.mock.calls.find(
      (call) => typeof call[1] === 'string' && call[1].includes('existingAttempts'),
    );
    expect(attemptWarnCall).toBeUndefined();
  });
});

// ─── Tests — Successful update ───────────────────────────────────────────────

describe('PATCH /api/quizzes/:id — successful update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockQuizFindUnique.mockResolvedValue(EXISTING_QUIZ);
    mockQuizAttemptCount.mockResolvedValue(0);
    mockReadValidatedBody.mockResolvedValue(UPDATE_BODY);
    mockQuizUpdate.mockResolvedValue(UPDATED_QUIZ);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls prisma.quiz.update with the correct quiz id', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockQuizUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: QUIZ_ID } }),
    );
  });

  it('updates only the provided fields (partial update)', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockQuizUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: UPDATE_BODY.title,
          passingScore: UPDATE_BODY.passingScore,
        }),
      }),
    );
  });

  it('returns the updated quiz', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ id: QUIZ_ID, title: UPDATE_BODY.title });
  });

  it('allows both FORMATEUR_PRINCIPAL and ADMIN to update', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ id: QUIZ_ID });
  });
});
