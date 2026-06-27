// @vitest-environment node
//
// Tests unitaires pour POST /api/cohortes/:id/shift-schedule (ST-04.4).
// On mock Prisma, Supabase et les globals Nitro.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockCohorteFindUnique = vi.fn();
const mockProgressionFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    cohorte: { findUnique: mockCohorteFindUnique },
    progression: { findMany: mockProgressionFindMany },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const COHORT_ID = 'cohorte-uuid-001';
const FORMATEUR_ID = 'formateur-uuid-001';
const STAGIAIRE_ID = 'stagiaire-uuid-001';

const FORMATEUR_USER = { id: FORMATEUR_ID, globalRole: 'FORMATEUR_PRINCIPAL' };
const ADMIN_USER = { id: 'admin-uuid-001', globalRole: 'ADMIN' };
const STAGIAIRE_USER = { id: STAGIAIRE_ID, globalRole: 'STAGIAIRE' };

// Dates for cohort modules (UTC midnight)
const TODAY = new Date('2026-09-01T00:00:00.000Z');
const TODAY_PLUS_7 = new Date('2026-09-08T00:00:00.000Z');

function makeCohorte(overrides: Record<string, unknown> = {}) {
  return {
    id: COHORT_ID,
    name: 'Promo Test',
    status: 'ACTIVE',
    memberships: [
      { role: 'FORMATEUR_PRINCIPAL', userId: FORMATEUR_ID },
      { role: 'STAGIAIRE', userId: STAGIAIRE_ID },
    ],
    cohortModules: [
      {
        id: 'cm-uuid-001',
        dueDate: TODAY,
        position: 1,
        moduleId: 'mod-uuid-001',
        module: { week: 1, title: 'Introduction' },
      },
      {
        id: 'cm-uuid-002',
        dueDate: TODAY_PLUS_7,
        position: 2,
        moduleId: 'mod-uuid-002',
        module: { week: 2, title: 'JavaScript Basics' },
      },
    ],
    ...overrides,
  };
}

/** Build a mock transaction that calls fn with a mock tx object. */
function makeMockTransaction(
  onCreateMany?: (args: unknown) => void,
  onAuditCreate?: (args: unknown) => void,
) {
  return async (fn: (tx: unknown) => Promise<unknown>) => {
    const mockTx = {
      cohortModule: { update: vi.fn() },
      progression: { update: vi.fn() },
      notification: {
        createMany: vi.fn().mockImplementation((args: unknown) => {
          onCreateMany?.(args);
        }),
      },
      auditLog: {
        create: vi.fn().mockImplementation((args: unknown) => {
          onAuditCreate?.(args);
        }),
      },
    };
    return fn(mockTx);
  };
}

function mockRouterParam(id: string) {
  vi.stubGlobal('getRouterParam', (_event: unknown, _key: string) => id);
}

const importHandler = () => import('~~/server/api/cohortes/[id]/shift-schedule.post');

// ─── Tests — Shift algorithm ──────────────────────────────────────────────────

describe('addDays utility (via preview mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParam(COHORT_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCohorteFindUnique.mockResolvedValue(makeCohorte());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preview mode: shifts N=7 days correctly for all modules', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      preview: boolean;
      days: number;
      items: Array<{ cohortModuleId: string; newDueDate: Date }>;
    };

    expect(result.preview).toBe(true);
    expect(result.days).toBe(7);
    expect(result.items).toHaveLength(2);

    // First module: Sep 01 + 7 = Sep 08
    const firstItemDate = new Date(result.items[0]?.newDueDate ?? '');
    expect(firstItemDate.getUTCDate()).toBe(8);
    expect(firstItemDate.getUTCMonth()).toBe(8); // September = index 8

    // Second module: Sep 08 + 7 = Sep 15
    const secondItemDate = new Date(result.items[1]?.newDueDate ?? '');
    expect(secondItemDate.getUTCDate()).toBe(15);
  });

  it('preview mode: shifts N=14 days correctly', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 14, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      items: Array<{ cohortModuleId: string; currentDueDate: Date; newDueDate: Date }>;
    };

    // First module: Sep 01 + 14 = Sep 15
    const firstItemDate = new Date(result.items[0]?.newDueDate ?? '');
    expect(firstItemDate.getUTCDate()).toBe(15);
  });

  it('preview mode: negative shift (days=-7) moves dates earlier', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: -7, preview: true, confirmed: true });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      preview: boolean;
      days: number;
      items: Array<{ newDueDate: Date }>;
    };

    expect(result.preview).toBe(true);

    // First module: Sep 01 - 7 = Aug 25
    const firstItemDate = new Date(result.items[0]?.newDueDate ?? '');
    expect(firstItemDate.getUTCDate()).toBe(25);
    expect(firstItemDate.getUTCMonth()).toBe(7); // August = index 7
  });

  it('preview mode: each module dueDate is independently shifted', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 3, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      items: Array<{ currentDueDate: Date; newDueDate: Date }>;
    };

    expect(result.items).toHaveLength(2);

    // Both items should have exactly 3 days added
    for (const item of result.items) {
      const diff = new Date(item.newDueDate).getTime() - new Date(item.currentDueDate).getTime();
      expect(diff).toBe(3 * 24 * 60 * 60 * 1000);
    }
  });
});

// ─── Tests — Validation ───────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/shift-schedule — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParam(COHORT_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCohorteFindUnique.mockResolvedValue(makeCohorte());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 422 when Zod validation fails (days > 30)', async () => {
    mockReadValidatedBody.mockImplementation(() => {
      const err = new Error('Validation failed');
      // @ts-expect-error — test error
      err.statusCode = 422;
      throw err;
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 422 when backward shift without confirmed=true', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: -5, preview: false, confirmed: false });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 422 });
  });

  it('accepts backward shift when confirmed=true (preview mode)', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: -5, preview: true, confirmed: true });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as { preview: boolean; days: number };
    expect(result.preview).toBe(true);
    expect(result.days).toBe(-5);
  });
});

// ─── Tests — Authentication ───────────────────────────────────────────────────

describe('POST /api/cohortes/:id/shift-schedule — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParam(COHORT_ID);
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
    mockServerSupabaseUser.mockResolvedValue({ id: 'ghost-user' });
    mockUserFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('POST /api/cohortes/:id/shift-schedule — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParam(COHORT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 when user is STAGIAIRE', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE_ID });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE_USER);
    mockCohorteFindUnique.mockResolvedValue(makeCohorte());

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when FORMATEUR is not principal of this cohort', async () => {
    const otherFormateurId = 'other-formateur-uuid';
    mockServerSupabaseUser.mockResolvedValue({ id: otherFormateurId });
    mockUserFindUnique.mockResolvedValue({
      id: otherFormateurId,
      globalRole: 'FORMATEUR_PRINCIPAL',
    });
    // Cohorte has a different formateur principal
    mockCohorteFindUnique.mockResolvedValue(
      makeCohorte({
        memberships: [{ role: 'FORMATEUR_PRINCIPAL', userId: FORMATEUR_ID }],
      }),
    );

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows ADMIN to shift regardless of cohort membership', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: ADMIN_USER.id });
    mockUserFindUnique.mockResolvedValue(ADMIN_USER);
    // Admin is not in memberships
    mockCohorteFindUnique.mockResolvedValue(
      makeCohorte({
        memberships: [{ role: 'STAGIAIRE', userId: STAGIAIRE_ID }],
      }),
    );
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as { preview: boolean };
    expect(result.preview).toBe(true);
  });

  it('allows formateur principal to shift their cohort', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCohorteFindUnique.mockResolvedValue(makeCohorte());
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as { preview: boolean };
    expect(result.preview).toBe(true);
  });
});

// ─── Tests — Apply shift (transaction) ────────────────────────────────────────

describe('POST /api/cohortes/:id/shift-schedule — apply shift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRouterParam(COHORT_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: FORMATEUR_ID });
    mockUserFindUnique.mockResolvedValue(FORMATEUR_USER);
    mockCohorteFindUnique.mockResolvedValue(makeCohorte());
    // Return empty progressions by default for apply tests
    mockProgressionFindMany.mockResolvedValue([]);
    mockTransaction.mockImplementation(makeMockTransaction());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls $transaction when preview=false', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('does NOT call $transaction in preview mode', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: true, confirmed: false });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns modulesUpdated count', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      modulesUpdated: number;
      stagiaireNotified: number;
    };

    expect(result.modulesUpdated).toBe(2); // 2 cohort modules in makeCohorte()
  });

  it('returns stagiaireNotified count', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    const { default: handler } = await importHandler();
    const result = (await handler(makeEvent())) as {
      stagiaireNotified: number;
    };

    expect(result.stagiaireNotified).toBe(1); // 1 stagiaire in makeCohorte()
  });

  it('sends notifications to stagiaires only (not formateurs)', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    let capturedNotifyData: unknown;
    mockTransaction.mockImplementation(
      makeMockTransaction((args) => {
        capturedNotifyData = args;
      }),
    );

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Only STAGIAIRE_ID should be in the notification data
    expect(capturedNotifyData).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ userId: STAGIAIRE_ID })]),
    });
    // Formateur should NOT receive a notification
    const notifData = (capturedNotifyData as { data: Array<{ userId: string }> }).data;
    expect(notifData.some((n) => n.userId === FORMATEUR_ID)).toBe(false);
  });

  it('creates an audit log entry with correct action', async () => {
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    let capturedAuditData: unknown;
    mockTransaction.mockImplementation(
      makeMockTransaction(undefined, (args) => {
        capturedAuditData = args;
      }),
    );

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(capturedAuditData).toMatchObject({
      data: expect.objectContaining({
        action: 'cohorte.schedule_shifted',
        entityType: 'Cohorte',
        entityId: COHORT_ID,
        actorId: FORMATEUR_ID,
      }),
    });
  });

  it('does not create notifications if no stagiaires in cohort', async () => {
    // Cohort with no stagiaires
    mockCohorteFindUnique.mockResolvedValue(
      makeCohorte({
        memberships: [{ role: 'FORMATEUR_PRINCIPAL', userId: FORMATEUR_ID }],
      }),
    );
    mockReadValidatedBody.mockResolvedValue({ days: 7, preview: false, confirmed: false });

    let notifyCallCount = 0;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        cohortModule: { update: vi.fn() },
        progression: { update: vi.fn() },
        notification: {
          createMany: vi.fn().mockImplementation(() => {
            notifyCallCount++;
          }),
        },
        auditLog: { create: vi.fn() },
      };
      return fn(mockTx);
    });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // createMany should NOT have been called with empty stagiaires
    expect(notifyCallCount).toBe(0);
  });
});

// ─── Tests — Shared schema ────────────────────────────────────────────────────

describe('shiftScheduleBodySchema', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects days > 30', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    expect(() => shiftScheduleBodySchema.parse({ days: 31 })).toThrow();
  });

  it('rejects days < -30', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    expect(() => shiftScheduleBodySchema.parse({ days: -31 })).toThrow();
  });

  it('rejects days = 0', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    expect(() => shiftScheduleBodySchema.parse({ days: 0 })).toThrow();
  });

  it('accepts days = 30', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    expect(() => shiftScheduleBodySchema.parse({ days: 30 })).not.toThrow();
  });

  it('accepts days = -30', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    expect(() => shiftScheduleBodySchema.parse({ days: -30 })).not.toThrow();
  });

  it('defaults preview to false when not provided', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    const result = shiftScheduleBodySchema.parse({ days: 7 });
    expect(result.preview).toBe(false);
  });

  it('defaults confirmed to false when not provided', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    const result = shiftScheduleBodySchema.parse({ days: 7 });
    expect(result.confirmed).toBe(false);
  });

  it('accepts optional reason string', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    const result = shiftScheduleBodySchema.parse({ days: 7, reason: 'Jour férié' });
    expect(result.reason).toBe('Jour férié');
  });

  it('rejects reason longer than 500 characters', async () => {
    const { shiftScheduleBodySchema } = await import('~~/shared/schemas/cohorte');
    const longReason = 'a'.repeat(501);
    expect(() => shiftScheduleBodySchema.parse({ days: 7, reason: longReason })).toThrow();
  });
});
