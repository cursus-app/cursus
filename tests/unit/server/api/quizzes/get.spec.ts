// @vitest-environment node
//
// Tests unitaires pour GET /api/quizzes/:id — lecture d'un quiz (ST-07.1).
//
// Comportement de masquage :
// - Formateur/Admin : réponse complète (questions avec isCorrect + explanation)
// - Stagiaire : options QCM réduites à {id, text} (isCorrect retiré),
//   explanation et expectedAnswer mis à '' (vide).
//
// Le handler retourne { ...quiz, questions: [...], questionsJson: undefined }.
// Les tests accèdent à `result.questions` (pas `result.questionsJson`).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockQuizFindUnique = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    quiz: { findUnique: mockQuizFindUnique },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
const FORMATEUR_USER = { id: 'formateur-uuid-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const STAGIAIRE_USER = { id: 'stagiaire-uuid-001', globalRole: 'STAGIAIRE' };

// Full quiz as stored in the DB — includes isCorrect and explanation
const MCQ_QUESTION = {
  id: 'q-001',
  type: 'mcq',
  text: 'Which framework uses the Composition API?',
  explanation: 'Vue.js introduced the Composition API in v3.',
  options: [
    { id: 'opt-001', text: 'Vue.js', isCorrect: true },
    { id: 'opt-002', text: 'React', isCorrect: false },
  ],
};

const SHORT_TEXT_QUESTION = {
  id: 'q-002',
  type: 'short_text',
  text: 'What is the capital of France?',
  expectedAnswer: 'Paris',
  caseSensitive: false,
  requiresManualValidation: false,
  explanation: 'Paris has been the capital since the 12th century.',
};

const MOCK_QUIZ = {
  id: QUIZ_ID,
  title: 'Introduction au Dev Web',
  questionsJson: [MCQ_QUESTION, SHORT_TEXT_QUESTION],
  passingScore: 70,
  randomize: true,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  module: null,
};

const importHandler = () => import('~~/server/api/quizzes/[id].get');

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('GET /api/quizzes/:id — authentication', () => {
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

describe('GET /api/quizzes/:id — not found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
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

// ─── Tests — Formateur view (full data) ──────────────────────────────────────

describe('GET /api/quizzes/:id — formateur receives full quiz with answers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_USER.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockQuizFindUnique.mockResolvedValue(MOCK_QUIZ);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the full quiz with isCorrect present on MCQ options for a formateur', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    // Handler returns { ...quiz, questions: [...], questionsJson: undefined }
    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const mcqQuestion = questions.find((q) => q['type'] === 'mcq');
    expect(mcqQuestion).toBeDefined();

    const options = mcqQuestion?.['options'] as Array<Record<string, unknown>>;
    expect(options).toBeDefined();
    expect('isCorrect' in (options?.[0] ?? {})).toBe(true);
  });

  it('returns explanation on MCQ questions for a formateur', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const mcqQuestion = questions.find((q) => q['type'] === 'mcq');
    expect((mcqQuestion?.['explanation'] as string).length).toBeGreaterThan(0);
  });

  it('returns expectedAnswer on short_text questions for a formateur', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const stQuestion = questions.find((q) => q['type'] === 'short_text');
    expect(stQuestion?.['expectedAnswer']).toBe('Paris');
  });

  it('returns quiz metadata (title, passingScore, randomize) for formateur', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({
      id: QUIZ_ID,
      title: MOCK_QUIZ.title,
      passingScore: 70,
      randomize: true,
    });
  });
});

// ─── Tests — Stagiaire view (stripped data) ──────────────────────────────────

describe('GET /api/quizzes/:id — stagiaire receives quiz without correct answers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_USER.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_USER);
    mockQuizFindUnique.mockResolvedValue(MOCK_QUIZ);
    mockGetRouterParam.mockImplementation((_e: unknown, key: string) =>
      key === 'id' ? QUIZ_ID : undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('strips isCorrect from MCQ options when user is STAGIAIRE', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const mcqQuestion = questions.find((q) => q['type'] === 'mcq');
    expect(mcqQuestion).toBeDefined();

    const options = mcqQuestion?.['options'] as Array<Record<string, unknown>>;
    for (const option of options ?? []) {
      // The handler strips options down to only { id, text }
      expect('isCorrect' in option).toBe(false);
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('text');
    }
  });

  it('sets explanation to empty string on MCQ questions when user is STAGIAIRE', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const mcqQuestion = questions.find((q) => q['type'] === 'mcq');
    expect(mcqQuestion?.['explanation']).toBe('');
  });

  it('sets expectedAnswer to empty string on short_text questions when user is STAGIAIRE', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const stQuestion = questions.find((q) => q['type'] === 'short_text');
    expect(stQuestion?.['expectedAnswer']).toBe('');
  });

  it('sets explanation to empty string on short_text questions when user is STAGIAIRE', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    const stQuestion = questions.find((q) => q['type'] === 'short_text');
    expect(stQuestion?.['explanation']).toBe('');
  });

  it('still returns quiz metadata for stagiaire', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({
      id: QUIZ_ID,
      title: MOCK_QUIZ.title,
      passingScore: 70,
      randomize: true,
    });
  });

  it('returns all questions with their text and id preserved for stagiaire', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const questions = (result as Record<string, unknown>)['questions'] as Array<
      Record<string, unknown>
    >;
    expect(questions).toHaveLength(MOCK_QUIZ.questionsJson.length);
    const mcqQuestion = questions.find((q) => q['type'] === 'mcq');
    expect(mcqQuestion?.['id']).toBe(MCQ_QUESTION.id);
    expect(mcqQuestion?.['text']).toBe(MCQ_QUESTION.text);
  });
});
