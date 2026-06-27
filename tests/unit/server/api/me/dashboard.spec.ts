// @vitest-environment node
//
// Tests unitaires pour GET /api/me/dashboard (ST-13.1)
// On mock Prisma et Supabase — pas de vraie DB nécessaire.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockPrismaUser = { findUnique: vi.fn() };
const mockPrismaProgression = {
  findFirst: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
};
const mockPrismaCohortModule = {
  count: vi.fn(),
  findMany: vi.fn(),
};
const mockPrismaUserBadge = {
  count: vi.fn(),
  findMany: vi.fn(),
};

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    progression: mockPrismaProgression,
    cohortModule: mockPrismaCohortModule,
    userBadge: mockPrismaUserBadge,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed-${id}`,
  hashEmail: (email: string) => `hashed-${email}`,
}));

const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — propriétés H3Error non standard ajoutées pour les tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const COHORT_ID = '550e8400-e29b-41d4-a716-446655440002';
const MODULE_ID = '550e8400-e29b-41d4-a716-446655440003';
const CM_ID = 'cm-001';

/** Charge le handler en isolation (modules réinitialisés par beforeEach) */
const importHandler = () => import('~~/server/api/me/dashboard.get');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    globalRole: 'STAGIAIRE',
    xpTotal: 150,
    memberships: [
      {
        role: 'STAGIAIRE',
        cohorteId: COHORT_ID,
        cohorte: { id: COHORT_ID, name: 'Cohorte Test', status: 'ACTIVE' },
      },
    ],
    ...overrides,
  };
}

function makeProgression(status = 'EN_COURS') {
  return {
    status,
    dueDate: new Date('2026-07-15T23:59:59Z'),
    cohortModuleId: CM_ID,
    cohortModule: {
      id: CM_ID,
      moduleId: MODULE_ID,
      module: { title: 'Module Test' },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/me/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Defaults : utilisateur authentifié avec une cohorte
    mockServerSupabaseUser.mockResolvedValue({ id: USER_ID });
    mockPrismaUser.findUnique.mockResolvedValue(makeUser());

    // Par défaut : aucune progression en cours
    mockPrismaProgression.findFirst.mockResolvedValue(null);
    mockPrismaProgression.count.mockResolvedValue(0);
    mockPrismaProgression.findMany.mockResolvedValue([]);
    mockPrismaCohortModule.count.mockResolvedValue(0);
    mockPrismaCohortModule.findMany.mockResolvedValue([]);
    mockPrismaUserBadge.count.mockResolvedValue(0);
    mockPrismaUserBadge.findMany.mockResolvedValue([]);
  });

  it('retourne 401 si utilisateur non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 401 si le profil DB est introuvable', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne la structure correcte pour un stagiaire sans cohorte', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(makeUser({ memberships: [] }));

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({
      currentWeek: {
        moduleId: null,
        moduleTitle: null,
        dueDate: null,
        status: null,
        hasSubmitted: false,
        cohortModuleId: null,
      },
      progress: {
        completedModules: 0,
        totalModules: 0,
        progressPct: 0,
        xpTotal: 150,
      },
      badges: { total: 0, last3: [] },
      feed: [],
      upcomingDeadlines: [],
    });
  });

  it('retourne currentWeek avec la progression EN_COURS', async () => {
    mockPrismaProgression.findFirst.mockResolvedValue(makeProgression('EN_COURS'));
    mockPrismaProgression.count.mockResolvedValue(2);
    mockPrismaCohortModule.count.mockResolvedValue(8);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.currentWeek).toMatchObject({
      moduleId: MODULE_ID,
      moduleTitle: 'Module Test',
      status: 'EN_COURS',
      hasSubmitted: false,
      cohortModuleId: CM_ID,
    });
    expect(result.currentWeek.dueDate).toBe('2026-07-15T23:59:59.000Z');
  });

  it('hasSubmitted est true quand le statut est SOUMIS', async () => {
    mockPrismaProgression.findFirst.mockResolvedValue(makeProgression('SOUMIS'));

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.currentWeek.hasSubmitted).toBe(true);
  });

  it('calcule progressPct correctement', async () => {
    mockPrismaProgression.count.mockResolvedValue(3);
    mockPrismaCohortModule.count.mockResolvedValue(10);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.progress).toMatchObject({
      completedModules: 3,
      totalModules: 10,
      progressPct: 30,
    });
  });

  it('progressPct est 0 si totalModules est 0', async () => {
    mockPrismaProgression.count.mockResolvedValue(0);
    mockPrismaCohortModule.count.mockResolvedValue(0);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.progress.progressPct).toBe(0);
  });

  it('retourne les 3 derniers badges', async () => {
    const now = new Date();
    mockPrismaUserBadge.count.mockResolvedValue(5);
    mockPrismaUserBadge.findMany.mockResolvedValue([
      {
        awardedAt: now,
        badge: {
          id: 'badge-1',
          code: 'FIRST_COMMIT',
          name: 'Premier commit',
          description: 'Décerné pour le premier commit',
          iconUrl: null,
          xpReward: 50,
        },
      },
    ]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.badges.total).toBe(5);
    expect(result.badges.last3).toHaveLength(1);
    expect(result.badges.last3[0]).toMatchObject({
      id: 'badge-1',
      code: 'FIRST_COMMIT',
      name: 'Premier commit',
      xpReward: 50,
    });
  });

  it('retourne le feed cohorte (validations récentes)', async () => {
    const validatedAt = new Date('2026-07-10T10:00:00Z');
    mockPrismaProgression.findMany.mockResolvedValue([
      {
        validatedAt,
        cohortModule: {
          module: { title: 'Module A' },
        },
      },
    ]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.feed).toHaveLength(1);
    expect(result.feed[0]).toMatchObject({
      type: 'VALIDATION',
      moduleTitle: 'Module A',
      occurredAt: validatedAt.toISOString(),
    });
  });

  it('exclut les validations sans validatedAt du feed', async () => {
    mockPrismaProgression.findMany.mockResolvedValue([
      {
        validatedAt: null,
        cohortModule: { module: { title: 'Module sans date' } },
      },
    ]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.feed).toHaveLength(0);
  });

  it('retourne les prochaines échéances triées', async () => {
    const due1 = new Date('2026-07-20T23:59:59Z');
    const due2 = new Date('2026-07-27T23:59:59Z');
    mockPrismaCohortModule.findMany.mockResolvedValue([
      {
        id: 'cm-1',
        moduleId: 'mod-1',
        dueDate: due1,
        module: { title: 'Module 1' },
        progressions: [{ status: 'EN_COURS' }],
      },
      {
        id: 'cm-2',
        moduleId: 'mod-2',
        dueDate: due2,
        module: { title: 'Module 2' },
        progressions: [],
      },
    ]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.upcomingDeadlines).toHaveLength(2);
    expect(result.upcomingDeadlines[0]).toMatchObject({
      cohortModuleId: 'cm-1',
      moduleTitle: 'Module 1',
      progressionStatus: 'EN_COURS',
    });
    expect(result.upcomingDeadlines[1]).toMatchObject({
      cohortModuleId: 'cm-2',
      moduleTitle: 'Module 2',
      progressionStatus: null,
    });
  });

  it('xpTotal reflète la valeur en DB', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(makeUser({ xpTotal: 1500 }));

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.progress.xpTotal).toBe(1500);
  });

  it('choisit la prochaine progression A_VENIR si aucune EN_COURS', async () => {
    // Premier findFirst (EN_COURS/etc.) retourne null
    // Deuxième findFirst (A_VENIR) retourne un module
    mockPrismaProgression.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeProgression('A_VENIR'));

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.currentWeek.moduleId).toBe(MODULE_ID);
    expect(result.currentWeek.status).toBe('A_VENIR');
    expect(result.currentWeek.hasSubmitted).toBe(false);
  });
});
