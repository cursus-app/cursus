// @vitest-environment node
//
// Tests unitaires pour xp-award.ts (ST-11.1).
// Pattern : vi.hoisted() + capturedHandler pour simuler l'exécution Inngest.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock hoisted ─────────────────────────────────────────────────────────────

const {
  mockSubmissionFindUnique,
  mockModuleFindUnique,
  mockTransaction,
  mockNotificationCreate,
  mockLoggerInfo,
  mockLoggerWarn,
  capturedHandler,
} = vi.hoisted(() => {
  let capturedHandler:
    | ((ctx: {
        event: { data: unknown };
        step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
      }) => Promise<unknown>)
    | null = null;

  const mockStep = {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => unknown) => fn()),
  };

  return {
    mockSubmissionFindUnique: vi.fn(),
    mockModuleFindUnique: vi.fn(),
    mockTransaction: vi.fn(),
    mockNotificationCreate: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    capturedHandler: {
      get: () => capturedHandler,
      set: (fn: typeof capturedHandler) => {
        capturedHandler = fn;
      },
    },
    mockStep,
  };
});

vi.mock('~~/server/inngest/client', () => ({
  inngest: {
    createFunction: vi
      .fn()
      .mockImplementation((_config: unknown, handler: typeof capturedHandler) => {
        capturedHandler.set(handler);
        return { _config, handler };
      }),
  },
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    submission: { findUnique: mockSubmissionFindUnique },
    module: { findUnique: mockModuleFindUnique },
    user: { update: vi.fn() },
    notification: { create: mockNotificationCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: vi.fn(),
  },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed:${id}`,
}));

// Import after mocks
await import('~~/server/inngest/xp-award');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_DATA = {
  submissionId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  moduleId: '00000000-0000-0000-0000-000000000003',
};

function makeStep(
  overrides?: Partial<{ run: (name: string, fn: () => unknown) => Promise<unknown> }>,
) {
  return {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => unknown) => fn()),
    ...overrides,
  };
}

function callHandler(eventData = EVENT_DATA, step = makeStep()) {
  const handler = capturedHandler.get();
  if (!handler) {
    throw new Error('Handler not captured');
  }
  return handler({ event: { data: eventData }, step });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('xpAwardFunction — idémpotence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut : transaction qui exécute le fn passé
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: { findUnique: vi.fn(), update: vi.fn() },
        user: { update: vi.fn() },
      };
      return fn(tx);
    });
  });

  it('attribue les XP si xpAwardedAt est null', async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      id: EVENT_DATA.submissionId,
      xpAwardedAt: null,
    });
    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 150 });

    // Transaction qui simule un lock réussi
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 150,
            xpObjectiveMonthly: null,
          }),
        },
      };
      return fn(tx);
    });

    mockNotificationCreate.mockResolvedValue({});

    const result = await callHandler();

    expect(result).toMatchObject({ xpReward: 150, xpTotal: 150 });
    expect(mockNotificationCreate).toHaveBeenCalledOnce();
  });

  it('skip si xpAwardedAt est déjà défini (idémpotence)', async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      id: EVENT_DATA.submissionId,
      xpAwardedAt: new Date('2026-07-01T10:00:00Z'),
    });

    const result = await callHandler();

    expect(result).toEqual({ skipped: true });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('skip si la soumission est introuvable', async () => {
    mockSubmissionFindUnique.mockResolvedValue(null);
    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 100 });

    const result = await callHandler();

    expect(result).toEqual({ skipped: true });
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: expect.any(String) }),
      'xp.award.submission_not_found',
    );
  });

  it('skip si le lock de transaction échoue (race condition)', async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      id: EVENT_DATA.submissionId,
      xpAwardedAt: null,
    });
    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 100 });

    // Transaction : le findUnique avec xpAwardedAt: null retourne null (déjà loué)
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi.fn().mockResolvedValue(null), // lock échoue
          update: vi.fn(),
        },
        user: { update: vi.fn() },
      };
      return fn(tx);
    });

    const result = await callHandler();

    expect(result).toEqual({ skipped: true });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it('pas de double attribution lors de 2 événements consécutifs', async () => {
    // Premier appel : xpAwardedAt = null → award
    mockSubmissionFindUnique
      .mockResolvedValueOnce({ id: EVENT_DATA.submissionId, xpAwardedAt: null })
      .mockResolvedValueOnce({
        id: EVENT_DATA.submissionId,
        xpAwardedAt: new Date('2026-07-01T10:00:00Z'),
      });

    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 100 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 100,
            xpObjectiveMonthly: null,
          }),
        },
      };
      return fn(tx);
    });

    mockNotificationCreate.mockResolvedValue({});

    const result1 = await callHandler();
    const result2 = await callHandler();

    expect(result1).toMatchObject({ xpReward: 100 });
    expect(result2).toEqual({ skipped: true });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });
});

describe('xpAwardFunction — objectif mensuel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmissionFindUnique.mockResolvedValue({
      id: EVENT_DATA.submissionId,
      xpAwardedAt: null,
    });
    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 100 });
    mockNotificationCreate.mockResolvedValue({});
  });

  it('crée une notification spéciale si objectif mensuel atteint', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 500, // vient d'atteindre 500 XP
            xpObjectiveMonthly: 500, // objectif = 500 XP
          }),
        },
      };
      return fn(tx);
    });

    const result = await callHandler();

    expect(result).toMatchObject({ objectiveMet: true });
    // 1 notification SUBMISSION_VALIDATED + 1 notification MONTHLY_OBJECTIVE_MET
    expect(mockNotificationCreate).toHaveBeenCalledTimes(2);
    expect(mockNotificationCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'MONTHLY_OBJECTIVE_MET' }) }),
    );
  });

  it("ne crée pas de notification spéciale si l'objectif n'est pas encore atteint", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 200,
            xpObjectiveMonthly: 500,
          }),
        },
      };
      return fn(tx);
    });

    const result = await callHandler();

    expect(result).toMatchObject({ objectiveMet: false });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it('ne crée pas de notification objectif si xpObjectiveMonthly est null', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 100,
            xpObjectiveMonthly: null,
          }),
        },
      };
      return fn(tx);
    });

    const result = await callHandler();

    expect(result).toMatchObject({ objectiveMet: false });
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);
  });

  it('utilise xpReward=100 par défaut si le module est introuvable', async () => {
    mockModuleFindUnique.mockResolvedValue(null);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 100,
            xpObjectiveMonthly: null,
          }),
        },
      };
      return fn(tx);
    });

    const result = await callHandler();

    expect(result).toMatchObject({ xpReward: 100 });
  });
});

describe('xpAwardFunction — observabilité', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('log info avec hashes après attribution réussie', async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      id: EVENT_DATA.submissionId,
      xpAwardedAt: null,
    });
    mockModuleFindUnique.mockResolvedValue({ id: EVENT_DATA.moduleId, xpReward: 75 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        submission: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: EVENT_DATA.submissionId, userId: EVENT_DATA.userId }),
          update: vi.fn().mockResolvedValue({}),
        },
        user: {
          update: vi.fn().mockResolvedValue({
            id: EVENT_DATA.userId,
            xpTotal: 75,
            xpObjectiveMonthly: null,
          }),
        },
      };
      return fn(tx);
    });

    mockNotificationCreate.mockResolvedValue({});

    await callHandler();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        userIdHash: `hashed:${EVENT_DATA.userId}`,
        submissionIdHash: `hashed:${EVENT_DATA.submissionId}`,
        xpReward: 75,
        xpTotal: 75,
      }),
      'xp.award.completed',
    );
  });
});
