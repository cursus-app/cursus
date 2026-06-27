// @vitest-environment node
//
// Tests unitaires — POST /api/me/progressions/:progressionId/alert (ST-05.3)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockServerSupabaseUser = vi.fn();
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: mockServerSupabaseUser,
}));

const mockUserFindUnique = vi.fn();
const mockProgressionFindUnique = vi.fn();
const mockAlertFindFirst = vi.fn();
const mockAlertCreate = vi.fn();
const mockProgressionUpdate = vi.fn();
const mockMembershipFindFirst = vi.fn();
const mockNotificationCreate = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    progression: { findUnique: mockProgressionFindUnique, update: mockProgressionUpdate },
    alert: { findFirst: mockAlertFindFirst, create: mockAlertCreate },
    membership: { findFirst: mockMembershipFindFirst },
    notification: { create: mockNotificationCreate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed_${id}`,
}));

const mockCheckRateLimit = vi.fn();
vi.mock('~~/server/utils/inMemoryRateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

const mockSendBlockedAlertEmail = vi.fn();
vi.mock('~~/server/utils/emailService', () => ({
  sendBlockedAlertEmail: mockSendBlockedAlertEmail,
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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROGRESSION_ID = 'prog-123';
const STAGIAIRE = {
  id: 'user-stagiaire-1',
  globalRole: 'STAGIAIRE',
  fullName: 'Jean Stagiaire',
  email: 'jean@example.com',
};
const OTHER_USER = {
  id: 'user-other-1',
  globalRole: 'STAGIAIRE',
  fullName: 'Other User',
  email: 'other@example.com',
};
const FORMATEUR = {
  id: 'user-formateur-1',
  email: 'formateur@example.com',
  fullName: 'Marie Formatrice',
};

const PROGRESSION = {
  id: PROGRESSION_ID,
  userId: STAGIAIRE.id,
  status: 'EN_COURS',
  cohortModule: {
    cohorteId: 'cohorte-1',
    module: { title: 'Introduction à Git' },
  },
};

const ALERT = {
  id: 'alert-1',
  createdAt: new Date(),
};

const VALID_MESSAGE = 'Je bloque depuis hier sur Docker et ne sais pas comment avancer.';

function makeEvent() {
  return { node: { req: {}, res: {} } };
}

const importHandler = () => import('~~/server/api/me/progressions/[progressionId]/alert.post');

// ─── Tests — Auth ─────────────────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
  });

  afterEach(() => vi.restoreAllMocks());

  it('throws 401 when not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 400 when progressionId is missing', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockGetRouterParam.mockReturnValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 401 when user has no DB profile', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── Tests — Body validation ──────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — body validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
  });

  afterEach(() => vi.restoreAllMocks());

  it('throws 400 when message is too short (< 20 chars)', async () => {
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: 'Court' });
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when message is too long (> 500 chars)', async () => {
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: 'a'.repeat(501) });
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when message is missing', async () => {
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({});
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── Tests — Authorization ────────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: VALID_MESSAGE });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('throws 403 when another user tries to alert on someone else progression', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: OTHER_USER.id });
    mockUserFindUnique.mockResolvedValue(OTHER_USER);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION); // owned by STAGIAIRE

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when progression is not found', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── Tests — Alert creation ───────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — alert created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: VALID_MESSAGE });
    });
    mockAlertFindFirst.mockResolvedValue(null); // no existing alert
    mockAlertCreate.mockResolvedValue(ALERT);
    mockProgressionUpdate.mockResolvedValue({ ...PROGRESSION, status: 'BLOQUE' });
    mockMembershipFindFirst.mockResolvedValue({ user: FORMATEUR });
    mockNotificationCreate.mockResolvedValue({ id: 'notif-1' });
    mockSendBlockedAlertEmail.mockResolvedValue({ id: 'email-1', success: true });
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates an alert with kind=STAGIAIRE_BLOCKED', async () => {
    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(mockAlertCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: STAGIAIRE.id,
          kind: 'STAGIAIRE_BLOCKED',
          severity: 'HIGH',
          sourceType: 'progression',
          sourceId: PROGRESSION_ID,
        }),
      }),
    );
    expect(result).toMatchObject({ alertId: ALERT.id, duplicate: false });
  });

  it('transitions progression to BLOQUE status', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockProgressionUpdate).toHaveBeenCalledWith({
      where: { id: PROGRESSION_ID },
      data: { status: 'BLOQUE' },
    });
  });

  it('creates in-app notification for formateur', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: FORMATEUR.id,
          type: 'ALERT_RAISED',
          title: 'Nouveau stagiaire bloqué',
        }),
      }),
    );
  });

  it('sends email alert to formateur', async () => {
    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Email is fire-and-forget so we wait a tick
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendBlockedAlertEmail).toHaveBeenCalledWith(
      FORMATEUR.email,
      FORMATEUR.fullName,
      STAGIAIRE.fullName,
      PROGRESSION.cohortModule.module.title,
      VALID_MESSAGE,
    );
  });

  it('does not transition if progression is already BLOQUE', async () => {
    mockProgressionFindUnique.mockResolvedValue({ ...PROGRESSION, status: 'BLOQUE' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockProgressionUpdate).not.toHaveBeenCalled();
  });

  it('does not transition if progression is VALIDE', async () => {
    mockProgressionFindUnique.mockResolvedValue({ ...PROGRESSION, status: 'VALIDE' });

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    expect(mockProgressionUpdate).not.toHaveBeenCalled();
  });
});

// ─── Tests — Idempotence ─────────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — idempotence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: VALID_MESSAGE });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns duplicate:true when an open alert already exists', async () => {
    mockAlertFindFirst.mockResolvedValue({ id: 'existing-alert-1' });

    const { default: handler } = await importHandler();
    const result = await handler(makeEvent());

    expect(result).toMatchObject({ duplicate: true, alertId: 'existing-alert-1' });
    // Must NOT create a new alert
    expect(mockAlertCreate).not.toHaveBeenCalled();
    // Must NOT update progression
    expect(mockProgressionUpdate).not.toHaveBeenCalled();
  });

  it('does not create a duplicate alert on second call', async () => {
    // First call: no existing alert → create
    mockAlertFindFirst.mockResolvedValueOnce(null);
    mockAlertCreate.mockResolvedValueOnce(ALERT);
    mockMembershipFindFirst.mockResolvedValue({ user: FORMATEUR });
    mockNotificationCreate.mockResolvedValue({ id: 'notif-1' });
    mockSendBlockedAlertEmail.mockResolvedValue({ id: 'email-1', success: true });
    mockProgressionUpdate.mockResolvedValue({ ...PROGRESSION, status: 'BLOQUE' });

    const { default: handler } = await importHandler();
    const first = await handler(makeEvent());
    expect(first).toMatchObject({ duplicate: false });

    // Second call: existing alert found → no duplicate
    vi.resetModules();
    mockAlertFindFirst.mockResolvedValueOnce({ id: ALERT.id });

    const { default: handler2 } = await importHandler();
    const second = await handler2(makeEvent());
    expect(second).toMatchObject({ duplicate: true });
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
  });
});

// ─── Tests — Rate limiting ────────────────────────────────────────────────────

describe('POST /api/me/progressions/:progressionId/alert — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetRouterParam.mockReturnValue(PROGRESSION_ID);
    mockServerSupabaseUser.mockResolvedValue({ id: STAGIAIRE.id });
    mockUserFindUnique.mockResolvedValue(STAGIAIRE);
  });

  afterEach(() => vi.restoreAllMocks());

  it('rejects request when rate limit is exceeded', async () => {
    const rateLimitError = new Error('Trop de requêtes');
    // @ts-expect-error — H3Error properties added for tests
    rateLimitError.statusCode = 429;
    mockCheckRateLimit.mockImplementation(() => {
      throw rateLimitError;
    });

    const { default: handler } = await importHandler();
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 });
  });

  it('calls checkRateLimit with the daily limit key', async () => {
    // Let rate limit pass to see if it was called correctly
    mockCheckRateLimit.mockImplementation(() => undefined);
    mockReadValidatedBody.mockImplementation(async (_e: unknown, fn: (raw: unknown) => unknown) => {
      return fn({ message: VALID_MESSAGE });
    });
    mockProgressionFindUnique.mockResolvedValue(PROGRESSION);
    mockAlertFindFirst.mockResolvedValue(null);
    mockAlertCreate.mockResolvedValue(ALERT);
    mockProgressionUpdate.mockResolvedValue({ ...PROGRESSION, status: 'BLOQUE' });
    mockMembershipFindFirst.mockResolvedValue(null);

    const { default: handler } = await importHandler();
    await handler(makeEvent());

    // Should be called twice: daily limit + debounce
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      `blocked-alert:${STAGIAIRE.id}:${PROGRESSION_ID}`,
      3,
      24 * 60 * 60 * 1_000,
    );
    // Debounce 2s
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      `blocked-alert:debounce:${STAGIAIRE.id}:${PROGRESSION_ID}`,
      1,
      2_000,
    );
  });
});
