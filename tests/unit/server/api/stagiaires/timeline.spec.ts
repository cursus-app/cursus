// @vitest-environment node
//
// Tests unitaires pour GET /api/stagiaires/:id/timeline (ST-13.3).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (vi.hoisted pour éviter le TDZ dans les factory vi.mock) ───────────

const { mockPrisma, mockServerSupabaseUser } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    submission: { findMany: vi.fn() },
    harnessRun: { findMany: vi.fn() },
    alert: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock('#supabase/server', () => ({ serverSupabaseUser: mockServerSupabaseUser }));
vi.mock('~~/server/utils/prisma', () => ({ prisma: mockPrisma }));
vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('~~/server/utils/hash', () => ({ hashId: (id: string) => `hashed:${id}` }));
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({ checkRateLimit: vi.fn() }));

// ─── H3 shims ────────────────────────────────────────────────────────────────

const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error shim
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

let mockRouterParamId = 'stagiaire-uuid';
vi.stubGlobal(
  'getRouterParam',
  vi.fn((_: unknown, key: string) => (key === 'id' ? mockRouterParamId : null)),
);

let mockQueryParams: Record<string, string> = {};
vi.stubGlobal(
  'getQuery',
  vi.fn(() => mockQueryParams),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

async function importHandler() {
  return import('../../../../../../server/api/stagiaires/[id]/timeline.get');
}

const FORMATEUR = { id: 'formateur-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const FORMATEUR_MEMBERSHIP = { id: 'mbr-001' };
const STAGIAIRE_MEMBERSHIP = { id: 'mbr-002' };

function baseSetup() {
  mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
  mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
  mockPrisma.membership.findFirst
    .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // formateur check
    .mockResolvedValueOnce(STAGIAIRE_MEMBERSHIP); // stagiaire check
  mockPrisma.submission.findMany.mockResolvedValue([]);
  mockPrisma.harnessRun.findMany.mockResolvedValue([]);
  mockPrisma.alert.findMany.mockResolvedValue([]);
  mockPrisma.auditLog.findMany.mockResolvedValue([]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stagiaires/:id/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParamId = 'stagiaire-uuid';
    mockQueryParams = { cohorteId: '00000000-0000-0000-0000-000000000001' };
  });

  it('lève 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève 400 si cohorteId absent', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockQueryParams = {}; // pas de cohorteId
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 400 si cohorteId est un UUID invalide', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockQueryParams = { cohorteId: 'not-a-uuid' };
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 400 si cursor est une date invalide', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockQueryParams = {
      cohorteId: '00000000-0000-0000-0000-000000000001',
      cursor: 'not-a-date',
    };
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lève 403 si le caller n'est pas formateur de la cohorte", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockPrisma.membership.findFirst.mockResolvedValue(null); // pas formateur
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lève 403 si le stagiaire n'est pas dans la cohorte", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP) // formateur ok
      .mockResolvedValueOnce(null); // stagiaire absent
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne une timeline vide si aucun événement', async () => {
    baseSetup();
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it('inclut les submissions dans la timeline', async () => {
    baseSetup();
    mockPrisma.submission.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        moduleId: 'mod-1',
        status: 'VALIDATED',
        repoUrl: 'https://github.com/test',
        submittedAt: new Date('2026-06-01T10:00:00Z'),
        overriddenById: null,
        overrideReason: null,
        module: { title: 'HTML/CSS' },
      },
    ]);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('submission');
    expect(result.events[0]?.data).toMatchObject({ status: 'VALIDATED', moduleName: 'HTML/CSS' });
  });

  it('inclut les alertes dans la timeline', async () => {
    baseSetup();
    mockPrisma.alert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        kind: 'SUBMISSION_LATE',
        severity: 'HIGH',
        createdAt: new Date('2026-06-02T10:00:00Z'),
        resolvedAt: null,
      },
    ]);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('alert');
  });

  it('filtre par type si ?type=submission (ne charge pas harness_run ni alert)', async () => {
    baseSetup();
    mockQueryParams = {
      cohorteId: '00000000-0000-0000-0000-000000000001',
      type: 'submission',
    };
    mockPrisma.submission.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        moduleId: 'mod-1',
        status: 'PENDING',
        repoUrl: 'https://github.com/test',
        submittedAt: new Date('2026-06-01T10:00:00Z'),
        overriddenById: null,
        overrideReason: null,
        module: { title: 'CSS' },
      },
    ]);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(1);
    // alert et audit ne doivent pas être appelés
    expect(mockPrisma.alert.findMany).not.toHaveBeenCalled();
  });

  it('trie les événements par timestamp décroissant', async () => {
    baseSetup();
    mockPrisma.submission.findMany.mockResolvedValue([
      {
        id: 's1',
        moduleId: 'm1',
        status: 'PENDING',
        repoUrl: 'x',
        submittedAt: new Date('2026-06-01T08:00:00Z'),
        overriddenById: null,
        overrideReason: null,
        module: { title: 'M1' },
      },
      {
        id: 's2',
        moduleId: 'm2',
        status: 'PENDING',
        repoUrl: 'x',
        submittedAt: new Date('2026-06-03T08:00:00Z'),
        overriddenById: null,
        overrideReason: null,
        module: { title: 'M2' },
      },
    ]);
    mockPrisma.alert.findMany.mockResolvedValue([
      {
        id: 'a1',
        kind: 'SUBMISSION_LATE',
        severity: 'MEDIUM',
        createdAt: new Date('2026-06-02T08:00:00Z'),
        resolvedAt: null,
      },
    ]);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    const timestamps = result.events.map((e: { timestamp: string }) => e.timestamp);
    const sorted = [...timestamps].sort((a: string, b: string) => (a < b ? 1 : -1));
    expect(timestamps).toEqual(sorted);
  });

  it('pagine à 50 événements et renvoie un nextCursor si plus de résultats', async () => {
    baseSetup();
    // Simuler 51 submissions (plus que PAGE_SIZE=50) — dates espacées d'1 heure
    const baseMs = new Date('2026-06-01T00:00:00Z').getTime();
    const submissions = Array.from({ length: 51 }, (_, i) => ({
      id: `sub-${i}`,
      moduleId: 'mod-1',
      status: 'PENDING',
      repoUrl: 'https://github.com',
      submittedAt: new Date(baseMs + i * 3_600_000),
      overriddenById: null,
      overrideReason: null,
      module: { title: `Module ${i}` },
    }));
    mockPrisma.submission.findMany.mockResolvedValue(submissions);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(50);
    expect(result.nextCursor).not.toBeNull();
  });

  it('admin bypass la vérification de membership', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'admin-001' });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-001', globalRole: 'ADMIN' });
    // stagiaire membership check (second call)
    mockPrisma.membership.findFirst.mockResolvedValue(STAGIAIRE_MEMBERSHIP);
    mockPrisma.submission.findMany.mockResolvedValue([]);
    mockPrisma.harnessRun.findMany.mockResolvedValue([]);
    mockPrisma.alert.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());
    expect(result.events).toHaveLength(0);
    // Le check formateur membership ne doit pas avoir été appelé pour un admin
    // (il est appelé seulement 1 fois pour stagiaire check, pas 2)
    expect(mockPrisma.membership.findFirst).toHaveBeenCalledTimes(1);
  });
});
