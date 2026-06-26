// @vitest-environment node
//
// Tests unitaires — PATCH /api/progressions/:id/transition (ST-08.1)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockProgressionFindUnique = vi.fn();
const mockMembershipFindFirst = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    progression: { findUnique: mockProgressionFindUnique },
    membership: { findFirst: mockMembershipFindFirst },
    $transaction: vi.fn(),
  },
}));

// Créer une classe d'erreur locale compatible avec InvalidTransitionError
// pour éviter les problèmes de hoisting de vi.mock()
class MockInvalidTransitionError extends Error {
  from: string;
  to: string;
  constructor(from: string, to: string) {
    super(`Transition invalide : ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

// NB : On ne peut pas référencer des imports dans les factories vi.mock() car
// vi.mock() est hoisted avant les imports. On expose un objet complet :
vi.mock('~~/server/utils/progressionStateMachine', () => ({
  InvalidTransitionError: MockInvalidTransitionError,
  transition: vi.fn(),
  isTerminal: vi.fn(),
  availableTransitions: vi.fn(),
  VALID_TRANSITIONS: new Map(),
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed_${id}`,
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

const mockReadValidatedBody = vi.fn();
vi.stubGlobal('readValidatedBody', mockReadValidatedBody);

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

// ─── Helper pour accéder au spy `transition` ──────────────────────────────────

async function getMockTransition() {
  const mod = await import('~~/server/utils/progressionStateMachine');
  return vi.mocked(mod.transition);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STAGIAIRE = { id: 'user-stagiaire-1', globalRole: 'STAGIAIRE' };
const FORMATEUR = { id: 'user-formateur-1', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN = { id: 'user-admin-1', globalRole: 'ADMIN' };

const PROGRESSION = {
  id: 'prog-1',
  userId: 'user-stagiaire-1',
  status: 'EN_COURS' as const,
  cohortModule: { cohorteId: 'cohorte-1' },
};

const UPDATED_PROGRESSION = {
  id: 'prog-1',
  status: 'SOUMIS',
  userId: 'user-stagiaire-1',
  cohortModuleId: 'cm-1',
  dueDate: new Date(),
  submittedAt: new Date(),
  validatedAt: null,
  overrideBy: null,
  overrideReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const importHandler = () => import('~~/server/api/progressions/[id]/transition.patch');

// ─── Tests — Auth ─────────────────────────────────────────────────────────────

describe('PATCH /api/progressions/:id/transition — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue('prog-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 404 when authenticated user has no DB profile', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when progression id is missing', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockGetRouterParam.mockReturnValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── Tests — Body validation ──────────────────────────────────────────────────

describe('PATCH /api/progressions/:id/transition — body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue('prog-1');
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 400 when body has invalid status', async () => {
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'INVALID_STATUS' });
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when progression not found', async () => {
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'SOUMIS' });
    });
    mockProgressionFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('PATCH /api/progressions/:id/transition — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue('prog-1');
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'SOUMIS' });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when another stagiaire tries to transition', async () => {
    const OTHER = { id: 'other-stagiaire', globalRole: 'STAGIAIRE' };
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER.id });
    mockUserFindUnique.mockResolvedValue(OTHER);
    mockProgressionFindUnique.mockResolvedValue({
      ...PROGRESSION,
      userId: 'user-stagiaire-1', // different user from OTHER
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows owner stagiaire to transition', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    const mockT = await getMockTransition();
    mockT.mockResolvedValue(UPDATED_PROGRESSION);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'SOUMIS' });
  });

  it('allows formateur to transition any progression', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    // Formateur is a member of the cohort
    mockMembershipFindFirst.mockResolvedValue({ id: 'membership-1', role: 'FORMATEUR_PRINCIPAL' });
    const mockT = await getMockTransition();
    mockT.mockResolvedValue(UPDATED_PROGRESSION);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'SOUMIS' });
  });

  it('allows admin to transition any progression', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN.id });
    mockUserFindUnique.mockResolvedValue(ADMIN);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    const mockT = await getMockTransition();
    mockT.mockResolvedValue(UPDATED_PROGRESSION);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'SOUMIS' });
  });

  it('throws 403 when stagiaire tries VALIDE_OVERRIDE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'VALIDE_OVERRIDE', reason: 'raison' });
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows formateur to trigger VALIDE_OVERRIDE with reason', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR.id });
    mockUserFindUnique.mockResolvedValue(FORMATEUR);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    // Formateur is a member of the cohort
    mockMembershipFindFirst.mockResolvedValue({ id: 'membership-1', role: 'FORMATEUR_PRINCIPAL' });
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'VALIDE_OVERRIDE', reason: 'Urgence pédagogique' });
    });
    const mockT = await getMockTransition();
    mockT.mockResolvedValue({ ...UPDATED_PROGRESSION, status: 'VALIDE_OVERRIDE' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toMatchObject({ status: 'VALIDE_OVERRIDE' });
  });
});

// ─── Tests — State machine errors ─────────────────────────────────────────────

describe('PATCH /api/progressions/:id/transition — state machine errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue('prog-1');
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ to: 'SOUMIS' });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 422 when transition is invalid (InvalidTransitionError)', async () => {
    const mockT = await getMockTransition();
    mockT.mockRejectedValue(new MockInvalidTransitionError('EN_COURS', 'SOUMIS'));

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 500 on unexpected errors', async () => {
    const mockT = await getMockTransition();
    mockT.mockRejectedValue(new Error('DB connection lost'));

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 500 });
  });

  it('returns updated progression on success', async () => {
    const mockT = await getMockTransition();
    mockT.mockResolvedValue(UPDATED_PROGRESSION);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toEqual(UPDATED_PROGRESSION);
  });
});
