// @vitest-environment node
//
// Tests unitaires pour GET /api/cohortes/:id/dashboard (ST-13.2).
// Teste les helpers de calcul KPI, la construction de la heatmap,
// et les contrôles d'accès (RLS formateur).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCohorteFindUnique = vi.fn();
const mockMembershipFindFirst = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockCohortModuleFindMany = vi.fn();
const mockProgressionFindMany = vi.fn();
const mockAlertCount = vi.fn();
const mockAlertFindMany = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cohorte: { findUnique: mockCohorteFindUnique },
    membership: {
      findFirst: mockMembershipFindFirst,
      findMany: mockMembershipFindMany,
    },
    cohortModule: { findMany: mockCohortModuleFindMany },
    progression: { findMany: mockProgressionFindMany },
    alert: {
      count: mockAlertCount,
      findMany: mockAlertFindMany,
    },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// H3 globals
const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error test shim
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);
vi.stubGlobal('getRouterParam', vi.fn((_, key: string) => (key === 'id' ? 'cohorte-123' : null)));

// ─── Helpers de test ──────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const FORMATEUR_DB_USER = { id: 'formateur-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_DB_USER = { id: 'admin-001', globalRole: 'ADMIN' };
const STAGIAIRE_DB_USER = { id: 'stagiaire-001', globalRole: 'STAGIAIRE' };

const COHORTE = { id: 'cohorte-123' };

const MEMBERSHIP_FORMATEUR = { id: 'mbr-001', role: 'FORMATEUR_PRINCIPAL' };

const TRAINEES_MEMBERSHIPS = [
  {
    userId: 'user-1',
    user: { id: 'user-1', fullName: 'Alice Dupont', avatarUrl: null, githubHandle: 'alice', deletedAt: null },
  },
  {
    userId: 'user-2',
    user: { id: 'user-2', fullName: 'Bob Martin', avatarUrl: null, githubHandle: 'bob', deletedAt: null },
  },
];

const COHORT_MODULES = [
  {
    id: 'cm-1',
    moduleId: 'mod-1',
    cohorteId: 'cohorte-123',
    position: 0,
    dueDate: new Date('2026-06-01'),
    module: { title: 'HTML/CSS', week: 1 },
  },
  {
    id: 'cm-2',
    moduleId: 'mod-2',
    cohorteId: 'cohorte-123',
    position: 1,
    dueDate: new Date('2026-06-08'),
    module: { title: 'JavaScript', week: 2 },
  },
];

const PROGRESSIONS = [
  { userId: 'user-1', cohortModuleId: 'cm-1', status: 'VALIDE', dueDate: new Date('2026-06-01') },
  { userId: 'user-1', cohortModuleId: 'cm-2', status: 'EN_COURS', dueDate: new Date('2026-06-08') },
  { userId: 'user-2', cohortModuleId: 'cm-1', status: 'VALIDE', dueDate: new Date('2026-06-01') },
  // user-2 cm-2 absent → statut par défaut A_VENIR
];

const importHandler = () => import('~~/server/api/cohortes/[id]/dashboard.get');

// ─── Tests helpers (computeMedian, computeSubmissionRate) ─────────────────────

describe('computeMedian — helper', () => {
  it('retourne 0 pour un tableau vide', async () => {
    const { computeMedian } = await importHandler();
    expect(computeMedian([])).toBe(0);
  });

  it('retourne la valeur unique pour un tableau à 1 élément', async () => {
    const { computeMedian } = await importHandler();
    expect(computeMedian([42])).toBe(42);
  });

  it('retourne la médiane pour un nombre impair d\'éléments', async () => {
    const { computeMedian } = await importHandler();
    expect(computeMedian([10, 50, 90])).toBe(50);
  });

  it('retourne la moyenne des deux centraux pour un nombre pair', async () => {
    const { computeMedian } = await importHandler();
    expect(computeMedian([10, 20, 30, 40])).toBe(25);
  });

  it('trie correctement avant de calculer la médiane', async () => {
    const { computeMedian } = await importHandler();
    expect(computeMedian([90, 10, 50])).toBe(50);
  });
});

describe('computeSubmissionRate — helper', () => {
  it('retourne 0 si aucun module dans la semaine courante', async () => {
    const { computeSubmissionRate } = await importHandler();
    const now = new Date('2026-06-27');
    const progressions = [
      { status: 'VALIDE' as const, dueDate: new Date('2026-05-01') }, // trop vieux
    ];
    expect(computeSubmissionRate(progressions, now)).toBe(0);
  });

  it('calcule correctement le taux quand tous ont soumis', async () => {
    const { computeSubmissionRate } = await importHandler();
    const now = new Date('2026-06-27');
    const progressions = [
      { status: 'VALIDE' as const, dueDate: new Date('2026-06-25') },
      { status: 'SOUMIS' as const, dueDate: new Date('2026-06-26') },
    ];
    expect(computeSubmissionRate(progressions, now)).toBe(100);
  });

  it('calcule un taux partiel (1/2 = 50%)', async () => {
    const { computeSubmissionRate } = await importHandler();
    const now = new Date('2026-06-27');
    const progressions = [
      { status: 'VALIDE' as const, dueDate: new Date('2026-06-25') },
      { status: 'A_VENIR' as const, dueDate: new Date('2026-06-26') },
    ];
    expect(computeSubmissionRate(progressions, now)).toBe(50);
  });
});

// ─── Tests endpoint — Authentication ─────────────────────────────────────────

describe('GET /api/cohortes/:id/dashboard — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 404 si l\'utilisateur n\'a pas de profil DB', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'ghost-user' });
    mockUserFindUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests endpoint — Contrôle d'accès (RLS) ─────────────────────────────────

describe('GET /api/cohortes/:id/dashboard — contrôle d\'accès', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCohorteFindUnique.mockResolvedValue(COHORTE);
    mockMembershipFindMany.mockResolvedValue([]);
    mockCohortModuleFindMany.mockResolvedValue([]);
    mockProgressionFindMany.mockResolvedValue([]);
    mockAlertCount.mockResolvedValue(0);
    mockAlertFindMany.mockResolvedValue([]);
  });

  it('retourne 403 si stagiaire tente d\'accéder au dashboard', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'stagiaire-001' });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_DB_USER);
    mockMembershipFindFirst.mockResolvedValue(null); // pas formateur de la cohorte

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne 403 si formateur d\'une autre cohorte tente d\'accéder', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-autre' });
    mockUserFindUnique.mockResolvedValue({ id: 'formateur-autre', globalRole: 'FORMATEUR_PRINCIPAL' });
    mockMembershipFindFirst.mockResolvedValue(null); // pas dans CETTE cohorte

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('autorise l\'admin même sans membership dans la cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'admin-001' });
    mockUserFindUnique.mockResolvedValue(ADMIN_DB_USER);
    // Pas d'appel à findFirst car admin bypasse le check

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toHaveProperty('kpis');
    expect(result).toHaveProperty('heatmap');
    expect(result).toHaveProperty('metadata');
  });

  it('autorise le formateur principal de la cohorte', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_DB_USER);
    mockMembershipFindFirst.mockResolvedValue(MEMBERSHIP_FORMATEUR);

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result).toHaveProperty('kpis');
  });
});

// ─── Tests endpoint — Structure de la réponse ─────────────────────────────────

describe('GET /api/cohortes/:id/dashboard — structure de la réponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_DB_USER);
    mockMembershipFindFirst.mockResolvedValue(MEMBERSHIP_FORMATEUR);
    mockCohorteFindUnique.mockResolvedValue(COHORTE);
    mockMembershipFindMany.mockResolvedValue(TRAINEES_MEMBERSHIPS);
    mockCohortModuleFindMany.mockResolvedValue(COHORT_MODULES);
    mockProgressionFindMany.mockResolvedValue(PROGRESSIONS);
    mockAlertCount.mockResolvedValue(1);
    mockAlertFindMany.mockResolvedValue([{ userId: 'user-1', sourceId: 'cm-1' }]);
  });

  it('retourne la structure attendue avec kpis, heatmap et metadata', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.kpis).toMatchObject({
      medianProgress: expect.any(Number),
      openAlerts: 1,
      capstonesThisWeek: expect.any(Number),
      submissionRate: expect.any(Number),
    });

    expect(result.metadata.trainees).toHaveLength(2);
    expect(result.metadata.modules).toHaveLength(2);
  });

  it('construit la heatmap avec les bonnes dimensions (stagiaires × modules)', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    // 2 stagiaires × 2 modules = 4 cellules
    expect(result.heatmap).toHaveLength(4);
  });

  it('attribue le statut A_VENIR quand aucune progression n\'existe', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    // user-2 n'a pas de progression pour cm-2 → A_VENIR
    const cell = result.heatmap.find(
      (c: { userId: string; cohortModuleId: string }) => c.userId === 'user-2' && c.cohortModuleId === 'cm-2',
    );
    expect(cell?.status).toBe('A_VENIR');
  });

  it('attribue hasAlert=true quand une alerte pointe vers cette cellule', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const alertedCell = result.heatmap.find(
      (c: { userId: string; cohortModuleId: string }) => c.userId === 'user-1' && c.cohortModuleId === 'cm-1',
    );
    expect(alertedCell?.hasAlert).toBe(true);
  });

  it('retourne le bon statut VALIDE pour une progression validée', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    const validatedCell = result.heatmap.find(
      (c: { userId: string; cohortModuleId: string }) => c.userId === 'user-2' && c.cohortModuleId === 'cm-1',
    );
    expect(validatedCell?.status).toBe('VALIDE');
  });

  it('calcule correctement la médiane de progression', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    // user-1 : 1/2 validé = 50%, user-2 : 1/2 validé = 50%, médiane = 50
    expect(result.kpis.medianProgress).toBe(50);
  });
});

// ─── Tests endpoint — Cohorte vide ────────────────────────────────────────────

describe('GET /api/cohortes/:id/dashboard — cohorte vide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_DB_USER);
    mockMembershipFindFirst.mockResolvedValue(MEMBERSHIP_FORMATEUR);
    mockCohorteFindUnique.mockResolvedValue(COHORTE);
    mockMembershipFindMany.mockResolvedValue([]);
    mockCohortModuleFindMany.mockResolvedValue([]);
    mockProgressionFindMany.mockResolvedValue([]);
    mockAlertCount.mockResolvedValue(0);
    mockAlertFindMany.mockResolvedValue([]);
  });

  it('retourne des KPIs à 0 pour une cohorte sans stagiaires', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result.kpis.medianProgress).toBe(0);
    expect(result.kpis.openAlerts).toBe(0);
    expect(result.heatmap).toHaveLength(0);
    expect(result.metadata.trainees).toHaveLength(0);
  });
});
