// @vitest-environment node
//
// Tests unitaires pour GET /api/me/alerts (ST-08.3)
// RLS : formateur ne voit que les alertes des stagiaires de ses cohortes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaUser = { findUnique: vi.fn() };
const mockPrismaMembership = { findMany: vi.fn(), findFirst: vi.fn() };
const mockPrismaProgression = { findMany: vi.fn() };
const mockPrismaAlert = { count: vi.fn(), findMany: vi.fn() };

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    membership: mockPrismaMembership,
    progression: mockPrismaProgression,
    alert: mockPrismaAlert,
  },
}));

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — propriétés H3Error simulées pour tests
  err.statusCode = opts.statusCode;
  return err;
});
vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);
vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));

const importHandler = () => import('~~/server/api/me/alerts.get');

// ---- Données de test ----

const FORMATEUR_ID = '550e8400-e29b-41d4-a716-446655440001';
const STAGIAIRE_ID = '550e8400-e29b-41d4-a716-446655440002';
const _STAGIAIRE_ID_OTHER = '550e8400-e29b-41d4-a716-446655440099';
const COHORTE_ID = 'cohorte-uuid-1';

const mockFormateur = {
  id: FORMATEUR_ID,
  globalRole: 'FORMATEUR_PRINCIPAL',
};

const mockAlert1 = {
  id: 'alert-uuid-1',
  kind: 'SUBMISSION_LATE',
  severity: 'HIGH',
  context: { message: 'Livrable semaine 3 manquant' },
  createdAt: new Date('2026-06-20T10:00:00Z'),
  resolvedAt: null,
  resolvedById: null,
  sourceType: null,
  sourceId: null,
  user: {
    id: STAGIAIRE_ID,
    fullName: 'Jean Dupont',
    email: 'jean@example.com',
    avatarUrl: null,
  },
  resolvedBy: null,
};

// ---- Tests ----

describe('GET /api/me/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 403 si utilisateur est STAGIAIRE', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_ID });
    mockPrismaUser.findUnique.mockResolvedValue({ id: STAGIAIRE_ID, globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it("retourne une liste vide si le formateur n'a aucune cohorte", async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);
    mockPrismaMembership.findMany.mockResolvedValue([]); // aucune cohorte

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('retourne les alertes ouvertes filtrées par cohorte du formateur', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ status: 'open', kind: 'all' }));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    // Membership du formateur
    mockPrismaMembership.findMany.mockResolvedValueOnce([
      { cohorteId: COHORTE_ID, moduleIds: null, role: 'FORMATEUR_PRINCIPAL' },
    ]);

    // Stagiaires dans la cohorte
    mockPrismaMembership.findMany.mockResolvedValueOnce([
      { userId: STAGIAIRE_ID },
    ]);

    // Alertes
    mockPrismaAlert.count.mockResolvedValue(1);
    mockPrismaAlert.findMany.mockResolvedValue([mockAlert1]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'alert-uuid-1', kind: 'SUBMISSION_LATE' });
    expect(result.meta.total).toBe(1);
  });

  it('filtre par kind si spécifié', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ kind: 'STAGIAIRE_BLOCKED', status: 'open' }));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    mockPrismaMembership.findMany.mockResolvedValueOnce([
      { cohorteId: COHORTE_ID, moduleIds: null, role: 'FORMATEUR_PRINCIPAL' },
    ]);
    mockPrismaMembership.findMany.mockResolvedValueOnce([{ userId: STAGIAIRE_ID }]);

    // Aucune alerte de type STAGIAIRE_BLOCKED
    mockPrismaAlert.count.mockResolvedValue(0);
    mockPrismaAlert.findMany.mockResolvedValue([]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result.data).toHaveLength(0);
    // Vérifier que le where Prisma incluait le bon kind
    const alertCall = mockPrismaAlert.findMany.mock.calls[0]?.[0];
    expect(alertCall?.where?.kind).toBe('STAGIAIRE_BLOCKED');
  });

  it('filtre les alertes résolues quand status=resolved', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ status: 'resolved' }));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    mockPrismaMembership.findMany.mockResolvedValueOnce([
      { cohorteId: COHORTE_ID, moduleIds: null, role: 'FORMATEUR_PRINCIPAL' },
    ]);
    mockPrismaMembership.findMany.mockResolvedValueOnce([{ userId: STAGIAIRE_ID }]);

    mockPrismaAlert.count.mockResolvedValue(0);
    mockPrismaAlert.findMany.mockResolvedValue([]);

    const { default: handler } = await importHandler();
    await handler({});

    const alertCall = mockPrismaAlert.findMany.mock.calls[0]?.[0];
    // Pour resolved : resolvedAt: { not: null }
    expect(alertCall?.where?.resolvedAt).toEqual({ not: null });
  });

  it("retourne une liste vide si le formateur n'a aucun stagiaire", async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    mockPrismaMembership.findMany.mockResolvedValueOnce([
      { cohorteId: COHORTE_ID, moduleIds: null, role: 'FORMATEUR_PRINCIPAL' },
    ]);
    // Aucun stagiaire
    mockPrismaMembership.findMany.mockResolvedValueOnce([]);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({ data: [], meta: { total: 0 } });
    // Prisma.alert ne doit PAS avoir été appelé
    expect(mockPrismaAlert.findMany).not.toHaveBeenCalled();
  });

  it('retourne 400 si les query params sont invalides', async () => {
    vi.stubGlobal('getQuery', vi.fn().mockReturnValue({ page: 'notanumber' }));
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });
});
