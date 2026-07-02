// @vitest-environment node
//
// Tests unitaires pour POST /api/stagiaires/:id/override (ST-13.3).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (vi.hoisted) ───────────────────────────────────────────────────────

const { mockPrisma, mockServerSupabaseUser, mockCheckRateLimit } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    submission: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cohortModule: { findUnique: vi.fn() },
    progression: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('#supabase/server', () => ({ serverSupabaseUser: mockServerSupabaseUser }));
vi.mock('~~/server/utils/prisma', () => ({ prisma: mockPrisma }));
vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('~~/server/utils/hash', () => ({ hashId: (id: string) => `hashed:${id}` }));
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({ checkRateLimit: mockCheckRateLimit }));

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

type ValidateResult =
  | { success: true; data: unknown }
  | { success: false; error: { flatten: () => unknown } };
let mockBodyValidator: (raw: unknown) => ValidateResult = () => ({
  success: true,
  data: {
    cohorteId: '00000000-0000-0000-0000-000000000001',
    submissionId: '00000000-0000-0000-0000-000000000002',
    action: 'validate',
    reason: 'Motif valide',
  },
});
vi.stubGlobal(
  'readValidatedBody',
  vi.fn((_event: unknown, _fn: (raw: unknown) => ValidateResult) =>
    Promise.resolve(mockBodyValidator({})),
  ),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

async function importHandler() {
  return import('../../../../../../server/api/stagiaires/[id]/override.post');
}

const FORMATEUR = { id: 'formateur-001', globalRole: 'FORMATEUR_PRINCIPAL' };
const FORMATEUR_MEMBERSHIP = { id: 'mbr-001' };
const STAGIAIRE_MEMBERSHIP = { id: 'mbr-002' };
const SUBMISSION = {
  id: '00000000-0000-0000-0000-000000000002',
  userId: 'stagiaire-uuid',
  moduleId: 'mod-1',
  status: 'PENDING',
};
const PROGRESSION = { id: 'prog-1', dueDate: new Date('2026-07-15') };
const COHORT_MODULE = { id: 'cm-1' };

function baseSetup() {
  mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
  mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
  mockPrisma.membership.findFirst
    .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP)
    .mockResolvedValueOnce(STAGIAIRE_MEMBERSHIP);
  mockPrisma.submission.findUnique.mockResolvedValue(SUBMISSION);
  mockPrisma.submission.update.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockCheckRateLimit.mockReturnValue(undefined);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/stagiaires/:id/override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParamId = 'stagiaire-uuid';
    mockBodyValidator = () => ({
      success: true,
      data: {
        cohorteId: '00000000-0000-0000-0000-000000000001',
        submissionId: '00000000-0000-0000-0000-000000000002',
        action: 'validate',
        reason: 'Motif valide',
      },
    });
    // Restore readValidatedBody to use our validator
    vi.stubGlobal(
      'readValidatedBody',
      vi.fn((_event: unknown, _fn: (raw: unknown) => ValidateResult) => {
        return Promise.resolve(mockBodyValidator({}));
      }),
    );
  });

  it('lève 401 si non authentifié', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève 400 si body invalide (raison trop courte)', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockBodyValidator = () => ({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: { reason: ['Le motif doit comporter au moins 5 caractères'] },
          formErrors: [],
        }),
      },
    });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 400 si extendDays manquant pour action=extend', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockBodyValidator = () => ({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: { extendDays: ["extendDays est obligatoire pour une extension d'échéance"] },
          formErrors: [],
        }),
      },
    });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lève 403 si caller n'est pas formateur de la cohorte", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockCheckRateLimit.mockReturnValue(undefined);
    mockPrisma.membership.findFirst.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lève 403 si le stagiaire n'est pas dans la cohorte", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockCheckRateLimit.mockReturnValue(undefined);
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(FORMATEUR_MEMBERSHIP)
      .mockResolvedValueOnce(null); // stagiaire absent
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lève 403 si submission.userId !== stagiaireId', async () => {
    baseSetup();
    mockPrisma.submission.findUnique.mockResolvedValue({
      ...SUBMISSION,
      userId: 'autre-stagiaire', // ne correspond pas
    });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('action=validate : met à jour la soumission et crée un AuditLog', async () => {
    baseSetup();
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toEqual({ success: true });
    expect(mockPrisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUBMISSION.id },
        data: expect.objectContaining({
          status: 'VALIDATED_OVERRIDE',
          overriddenById: 'formateur-001',
          overrideReason: 'Motif valide',
        }),
      }),
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'submission.override.validate',
          entityType: 'Submission',
          entityId: SUBMISSION.id,
        }),
      }),
    );
  });

  it('action=extend : met à jour la progression et crée un AuditLog', async () => {
    baseSetup();
    mockBodyValidator = () => ({
      success: true,
      data: {
        cohorteId: '00000000-0000-0000-0000-000000000001',
        submissionId: '00000000-0000-0000-0000-000000000002',
        action: 'extend',
        reason: 'Motif extension',
        extendDays: 7,
      },
    });
    vi.stubGlobal(
      'readValidatedBody',
      vi.fn((_event: unknown, _fn: (raw: unknown) => ValidateResult) => {
        return Promise.resolve(mockBodyValidator({}));
      }),
    );
    mockPrisma.cohortModule.findUnique.mockResolvedValue(COHORT_MODULE);
    mockPrisma.progression.findUnique.mockResolvedValue(PROGRESSION);
    mockPrisma.progression.update.mockResolvedValue({});
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toEqual({ success: true });
    expect(mockPrisma.progression.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrideBy: 'formateur-001',
          overrideReason: 'Motif extension',
        }),
      }),
    );
    // dueDate doit être 7 jours après le 15 juillet → 22 juillet
    const updateCall = mockPrisma.progression.update.mock.calls[0]?.[0];
    const newDueDate: Date = updateCall?.data?.dueDate;
    expect(newDueDate?.toISOString().startsWith('2026-07-22')).toBe(true);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'submission.override.extend' }),
      }),
    );
  });

  it('lève 404 si progression introuvable pour action=extend', async () => {
    baseSetup();
    mockBodyValidator = () => ({
      success: true,
      data: {
        cohorteId: '00000000-0000-0000-0000-000000000001',
        submissionId: '00000000-0000-0000-0000-000000000002',
        action: 'extend',
        reason: 'Motif extension',
        extendDays: 5,
      },
    });
    vi.stubGlobal(
      'readValidatedBody',
      vi.fn((_event: unknown, _fn: (raw: unknown) => ValidateResult) => {
        return Promise.resolve(mockBodyValidator({}));
      }),
    );
    mockPrisma.cohortModule.findUnique.mockResolvedValue(COHORT_MODULE);
    mockPrisma.progression.findUnique.mockResolvedValue(null);
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lève 409 si dueDate est null pour action=extend', async () => {
    baseSetup();
    mockBodyValidator = () => ({
      success: true,
      data: {
        cohorteId: '00000000-0000-0000-0000-000000000001',
        submissionId: '00000000-0000-0000-0000-000000000002',
        action: 'extend',
        reason: 'Motif extension',
        extendDays: 5,
      },
    });
    vi.stubGlobal(
      'readValidatedBody',
      vi.fn((_event: unknown, _fn: (raw: unknown) => ValidateResult) => {
        return Promise.resolve(mockBodyValidator({}));
      }),
    );
    mockPrisma.cohortModule.findUnique.mockResolvedValue(COHORT_MODULE);
    mockPrisma.progression.findUnique.mockResolvedValue({ id: 'prog-1', dueDate: null });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rate limit : propage l'erreur si checkRateLimit throw", async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'formateur-001' });
    mockPrisma.user.findUnique.mockResolvedValue(FORMATEUR);
    mockCheckRateLimit.mockImplementation(() => {
      throw createError({ statusCode: 429, message: 'Too Many Requests' });
    });
    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 });
  });
});
