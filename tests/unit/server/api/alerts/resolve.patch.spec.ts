// @vitest-environment node
//
// Tests unitaires pour PATCH /api/alerts/:id/resolve (ST-08.3)
// Vérifie : auth, RBAC, RLS inter-cohortes, mise à jour resolvedAt/resolvedById.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockPrismaUser = { findUnique: vi.fn() };
const mockPrismaMembership = { findMany: vi.fn(), findFirst: vi.fn() };
const mockPrismaAlert = { findUnique: vi.fn(), update: vi.fn() };

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
    membership: mockPrismaMembership,
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

const mockGetRouterParam = vi.fn();
vi.stubGlobal('getRouterParam', mockGetRouterParam);

const importHandler = () => import('~~/server/api/alerts/[id]/resolve.patch');

// ---- Données de test ----

const FORMATEUR_ID = '550e8400-e29b-41d4-a716-446655440001';
const STAGIAIRE_ID = '550e8400-e29b-41d4-a716-446655440002';
const STAGIAIRE_OTHER = '550e8400-e29b-41d4-a716-446655440099';
const ALERT_ID = 'alert-uuid-1';
const COHORTE_ID = 'cohorte-uuid-1';

const mockFormateur = { id: FORMATEUR_ID, globalRole: 'FORMATEUR_PRINCIPAL' };
const mockAlert = { id: ALERT_ID, resolvedAt: null, userId: STAGIAIRE_ID };
const mockAlertAlreadyResolved = {
  id: ALERT_ID,
  resolvedAt: new Date('2026-06-27T10:00:00Z'),
  userId: STAGIAIRE_ID,
};

// ---- Tests ----

describe('PATCH /api/alerts/:id/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(ALERT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retourne 403 si utilisateur est STAGIAIRE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_ID });
    mockPrismaUser.findUnique.mockResolvedValue({ id: STAGIAIRE_ID, globalRole: 'STAGIAIRE' });

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retourne 404 si l\'alerte est introuvable', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);
    mockPrismaAlert.findUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retourne 409 si l\'alerte est déjà résolue', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);
    mockPrismaAlert.findUnique.mockResolvedValue(mockAlertAlreadyResolved);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retourne 403 si le stagiaire n\'est pas dans une cohorte du formateur (RLS)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);
    mockPrismaAlert.findUnique.mockResolvedValue({
      ...mockAlert,
      userId: STAGIAIRE_OTHER, // stagiaire dans une autre cohorte
    });

    // Cohortes du formateur
    mockPrismaMembership.findMany.mockResolvedValue([
      { cohorteId: COHORTE_ID },
    ]);

    // Pas de membership du stagiaire dans ces cohortes
    mockPrismaMembership.findFirst.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('résout l\'alerte et retourne les données mises à jour', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);
    mockPrismaAlert.findUnique.mockResolvedValue(mockAlert);

    // Cohortes du formateur
    mockPrismaMembership.findMany.mockResolvedValue([
      { cohorteId: COHORTE_ID },
    ]);

    // Le stagiaire est dans la cohorte du formateur
    mockPrismaMembership.findFirst.mockResolvedValue({
      userId: STAGIAIRE_ID,
      cohorteId: COHORTE_ID,
      role: 'STAGIAIRE',
    });

    const resolvedAlert = {
      id: ALERT_ID,
      kind: 'SUBMISSION_LATE',
      severity: 'HIGH',
      resolvedAt: new Date('2026-06-27T12:00:00Z'),
      resolvedById: FORMATEUR_ID,
    };
    mockPrismaAlert.update.mockResolvedValue(resolvedAlert);

    const { default: handler } = await importHandler();
    const result = await handler({});

    expect(result).toMatchObject({
      id: ALERT_ID,
      resolvedById: FORMATEUR_ID,
    });
    expect(result.resolvedAt).toBeTruthy();

    // Vérifier que update a bien été appelé avec les bons paramètres
    const updateCall = mockPrismaAlert.update.mock.calls[0]?.[0];
    expect(updateCall?.where?.id).toBe(ALERT_ID);
    expect(updateCall?.data?.resolvedById).toBe(FORMATEUR_ID);
    expect(updateCall?.data?.resolvedAt).toBeInstanceOf(Date);
  });

  it('retourne 400 si l\'id est manquant', async () => {
    mockGetRouterParam.mockReturnValue(undefined);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockPrismaUser.findUnique.mockResolvedValue(mockFormateur);

    const { default: handler } = await importHandler();
    await expect(() => handler({})).rejects.toMatchObject({ statusCode: 400 });
  });
});
