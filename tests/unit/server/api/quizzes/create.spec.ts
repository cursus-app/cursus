// @vitest-environment node
//
// Tests unitaires pour POST /api/quizzes — création d'un quiz (ST-07.1).
// Autorisé pour FORMATEUR_PRINCIPAL, CO_FORMATEUR et ADMIN.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockQuizCreate = vi.fn();
const mockModuleFindUnique = vi.fn();
const mockModuleUpdate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    quiz: { create: mockQuizCreate },
    module: { findUnique: mockModuleFindUnique, update: mockModuleUpdate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCheckRateLimit = vi.fn();
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
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
vi.stubGlobal('setResponseStatus', vi.fn());

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const CO_FORMATEUR_USER = { id: 'cofo-uuid-001', globalRole: 'CO_FORMATEUR' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };

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

const VALID_BODY = {
  title: 'Introduction au Dev Web',
  passingScore: 70,
  randomize: false,
  questions: MCQ_QUESTIONS,
};

const MODULE_ID = '550e8400-e29b-41d4-a716-446655440099';
const VALID_BODY_WITH_MODULE = {
  ...VALID_BODY,
  moduleId: MODULE_ID,
};

const CREATED_QUIZ = {
  id: 'quiz-uuid-001',
  title: VALID_BODY.title,
  questionsJson: MCQ_QUESTIONS,
  passingScore: 70,
  randomize: false,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
};

// Module owned by the formateur (for module-linking tests)
const EXISTING_MODULE = {
  id: MODULE_ID,
  quizId: null,
  cursus: { ownerId: FORMATEUR_USER.id },
};

const importHandler = () => import('~~/server/api/quizzes/index.post');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('POST /api/quizzes — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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

describe('POST /api/quizzes — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: 'some-user-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when user is STAGIAIRE', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'stagiaire-id', globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows FORMATEUR_PRINCIPAL to create a quiz', async () => {
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockQuizCreate.mockResolvedValue(CREATED_QUIZ);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: 'quiz-uuid-001' });
  });

  it('allows CO_FORMATEUR to create a quiz', async () => {
    mockUserFindUnique.mockResolvedValue(CO_FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockQuizCreate.mockResolvedValue({ ...CREATED_QUIZ, id: 'quiz-uuid-002' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: 'quiz-uuid-002' });
  });

  it('allows ADMIN to create a quiz', async () => {
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockQuizCreate.mockResolvedValue({ ...CREATED_QUIZ, id: 'quiz-uuid-003' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ id: 'quiz-uuid-003' });
  });
});

// ─── Tests — Body Validation (via readValidatedBody rejection) ───────────────

describe('POST /api/quizzes — body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 400 when body is missing required fields', async () => {
    const validationError = Object.assign(new Error('Body validation failed'), {
      statusCode: 400,
    });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when MCQ question has no correct answer', async () => {
    const validationError = Object.assign(new Error('quiz.errors.atLeastOneCorrectAnswer'), {
      statusCode: 400,
    });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when MCQ question has fewer than 2 options', async () => {
    const validationError = Object.assign(new Error('quiz.errors.atLeastTwoOptions'), {
      statusCode: 400,
    });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when short_text question has empty expectedAnswer without manual validation', async () => {
    const validationError = Object.assign(new Error('quiz.errors.expectedAnswerRequired'), {
      statusCode: 400,
    });
    mockReadValidatedBody.mockRejectedValue(validationError);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── Tests — Creation behaviour ──────────────────────────────────────────────

describe('POST /api/quizzes — creation behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY);
    mockQuizCreate.mockResolvedValue(CREATED_QUIZ);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates quiz with the correct questionsJson payload', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockQuizCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: VALID_BODY.title,
          questionsJson: MCQ_QUESTIONS,
        }),
      }),
    );
  });

  it('returns the newly created quiz', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ id: 'quiz-uuid-001', title: VALID_BODY.title });
  });

  it('does NOT call module.update when no moduleId is provided', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).not.toHaveBeenCalled();
  });
});

// ─── Tests — Module linking ───────────────────────────────────────────────────

describe('POST /api/quizzes — module linking when moduleId is provided', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockReadValidatedBody.mockResolvedValue(VALID_BODY_WITH_MODULE);
    mockModuleFindUnique.mockResolvedValue(EXISTING_MODULE);
    mockQuizCreate.mockResolvedValue(CREATED_QUIZ);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links quiz to module by calling module.update with quizId', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockModuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MODULE_ID },
        data: expect.objectContaining({ quizId: CREATED_QUIZ.id }),
      }),
    );
  });

  it('throws 404 when moduleId references a non-existent module', async () => {
    mockModuleFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 when module already has a quiz assigned', async () => {
    mockModuleFindUnique.mockResolvedValue({
      ...EXISTING_MODULE,
      quizId: 'existing-quiz-id',
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 403 when user is not the cursus owner (and not ADMIN)', async () => {
    mockModuleFindUnique.mockResolvedValue({
      ...EXISTING_MODULE,
      cursus: { ownerId: 'other-owner-uuid' }, // not our formateur
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── Tests — Rate limiting ────────────────────────────────────────────────────

describe('POST /api/quizzes — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 429 when rate limit is exceeded', async () => {
    const rateLimitError = Object.assign(new Error('Too many requests'), { statusCode: 429 });
    mockCheckRateLimit.mockImplementation(() => {
      throw rateLimitError;
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 });
  });
});
