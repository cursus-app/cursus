// @vitest-environment node
//
// Tests unitaires pour badge-award.ts (ST-11.2).
// Pattern : vi.hoisted() + capturedHandler — identique à xpAward.spec.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────

const {
  mockHarnessRunFindFirst,
  mockBadgeFindMany,
  mockUserBadgeCreate,
  mockNotificationCreate,
  mockLoggerInfo,
  mockLoggerWarn,
  mockLoggerError,
  capturedHandler,
} = vi.hoisted(() => {
  let capturedHandler:
    | ((ctx: {
        event: { data: unknown };
        step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
      }) => Promise<unknown>)
    | null = null;

  return {
    mockHarnessRunFindFirst: vi.fn(),
    mockBadgeFindMany: vi.fn(),
    mockUserBadgeCreate: vi.fn(),
    mockNotificationCreate: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
    capturedHandler: {
      get: () => capturedHandler,
      set: (fn: typeof capturedHandler) => {
        capturedHandler = fn;
      },
    },
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
    harnessRun: { findFirst: mockHarnessRunFindFirst },
    badge: { findMany: mockBadgeFindMany },
    userBadge: { create: mockUserBadgeCreate },
    notification: { create: mockNotificationCreate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed:${id}`,
}));

// Import déclenche la création du handler via inngest.createFunction
await import('~~/server/inngest/badge-award');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_DATA = {
  submissionId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  moduleId: '00000000-0000-0000-0000-000000000003',
};

function makeStep() {
  return {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => unknown) => fn()),
  };
}

function callHandler(eventData = EVENT_DATA, step = makeStep()) {
  const handler = capturedHandler.get();
  if (!handler) {
    throw new Error('Handler not captured');
  }
  return handler({ event: { data: eventData }, step });
}

/** Construit un checksJson valide avec les statuts donnés. */
function makeChecksJson(checks: Array<{ check_id: string; status: string }>) {
  return { checks };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('badgeAwardFunction — HarnessRun introuvable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHarnessRunFindFirst.mockResolvedValue(null);
  });

  it('retourne awarded=[] si aucun HarnessRun SUCCESS trouvé', async () => {
    const result = await callHandler();
    expect(result).toEqual({ awarded: [] });
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ submissionIdHash: expect.any(String) }),
      'badge.award.harness_run_not_found',
    );
  });

  it("ne crée aucun badge si le HarnessRun n'est pas trouvé", async () => {
    await callHandler();
    expect(mockUserBadgeCreate).not.toHaveBeenCalled();
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});

describe('badgeAwardFunction — checks matchants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attribue un badge si le check_id correspondant est en succès', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([{ check_id: 'url_responds', status: 'success' }]),
    });
    mockBadgeFindMany.mockResolvedValue([{ id: 'badge-uuid-1', code: 'premier-deploy' }]);
    mockUserBadgeCreate.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});

    const result = await callHandler();

    expect(result).toEqual({ awarded: ['premier-deploy'] });
    expect(mockUserBadgeCreate).toHaveBeenCalledOnce();
    expect(mockNotificationCreate).toHaveBeenCalledOnce();
  });

  it('crée une notification de type BADGE_AWARDED', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([{ check_id: 'url_responds', status: 'success' }]),
    });
    mockBadgeFindMany.mockResolvedValue([{ id: 'badge-uuid-1', code: 'premier-deploy' }]);
    mockUserBadgeCreate.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});

    await callHandler();

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'BADGE_AWARDED' }),
      }),
    );
  });

  it('attribue plusieurs badges si plusieurs checks matchent', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([
        { check_id: 'url_responds', status: 'success' },
        { check_id: 'commits_signed', status: 'success' },
        { check_id: 'all_modules_validated', status: 'success' },
      ]),
    });
    mockBadgeFindMany.mockResolvedValue([
      { id: 'badge-uuid-1', code: 'premier-deploy' },
      { id: 'badge-uuid-2', code: 'commit-signe' },
      { id: 'badge-uuid-3', code: 'cursus-complet' },
    ]);
    mockUserBadgeCreate.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});

    const result = await callHandler();

    expect((result as { awarded: string[] }).awarded).toHaveLength(3);
    expect(mockUserBadgeCreate).toHaveBeenCalledTimes(3);
    expect(mockNotificationCreate).toHaveBeenCalledTimes(3);
  });

  it('retourne awarded=[] si aucun check ne correspond à un badge', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([
        { check_id: 'lighthouse_score', status: 'success' },
        { check_id: 'readme_present', status: 'success' },
      ]),
    });
    mockBadgeFindMany.mockResolvedValue([]);

    const result = await callHandler();

    expect(result).toEqual({ awarded: [] });
    expect(mockUserBadgeCreate).not.toHaveBeenCalled();
  });
});

describe('badgeAwardFunction — idémpotence (badge déjà attribué)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skip silencieusement si la contrainte unique est violée', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([{ check_id: 'url_responds', status: 'success' }]),
    });
    mockBadgeFindMany.mockResolvedValue([{ id: 'badge-uuid-1', code: 'premier-deploy' }]);
    // Simule violation de contrainte @@unique (P2002)
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: { target: ['user_id', 'badge_id'] },
    });
    mockUserBadgeCreate.mockRejectedValue(p2002);
    mockNotificationCreate.mockResolvedValue({});

    // Ne doit pas throw
    await expect(callHandler()).resolves.not.toThrow();

    const result = await callHandler();
    // Badge déjà attribué → awarded vide
    expect((result as { awarded: string[] }).awarded).toHaveLength(0);
    // Pas de notification si contrainte violée
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});

describe('badgeAwardFunction — données invalides (Zod)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retourne { skipped: true } si event.data ne passe pas la validation Zod', async () => {
    const result = await callHandler({ submissionId: 'not-a-uuid', userId: '', moduleId: '' });
    expect(result).toEqual({ skipped: true });
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ errors: expect.any(Object) }),
      'badge.award.invalid_event_data',
    );
  });

  it('ne tente aucune requête DB si le payload est invalide', async () => {
    await callHandler({ submissionId: 'invalid', userId: 'invalid', moduleId: 'invalid' });
    expect(mockHarnessRunFindFirst).not.toHaveBeenCalled();
    expect(mockUserBadgeCreate).not.toHaveBeenCalled();
  });
});

describe('badgeAwardFunction — observabilité', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('log info avec les IDs hashés après attribution réussie', async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([{ check_id: 'url_responds', status: 'success' }]),
    });
    mockBadgeFindMany.mockResolvedValue([{ id: 'badge-uuid-1', code: 'premier-deploy' }]);
    mockUserBadgeCreate.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});

    await callHandler();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        userIdHash: `hashed:${EVENT_DATA.userId}`,
        submissionIdHash: `hashed:${EVENT_DATA.submissionId}`,
        badges: ['premier-deploy'],
      }),
      'badge.award.completed',
    );
  });

  it("ne log pas info si aucun badge n'est attribué", async () => {
    mockHarnessRunFindFirst.mockResolvedValue({
      checksJson: makeChecksJson([{ check_id: 'lighthouse_score', status: 'success' }]),
    });
    mockBadgeFindMany.mockResolvedValue([]);

    await callHandler();

    expect(mockLoggerInfo).not.toHaveBeenCalledWith(expect.anything(), 'badge.award.completed');
  });
});
