// @vitest-environment node
//
// Tests unitaires pour cleanupStaleRuns.ts (ST-06.6)
// Pattern vi.hoisted() + capturedHandler — identique aux autres specs Inngest.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────

const {
  mockHarnessRunFindMany,
  mockHarnessRunUpdateMany,
  mockSentryCaptureException,
  mockSendSlackAlert,
  mockLoggerInfo,
  mockLoggerError,
  capturedHandler,
} = vi.hoisted(() => {
  let capturedHandler: ((ctx: object) => Promise<unknown>) | null = null;
  return {
    mockHarnessRunFindMany: vi.fn(),
    mockHarnessRunUpdateMany: vi.fn(),
    mockSentryCaptureException: vi.fn(),
    mockSendSlackAlert: vi.fn().mockResolvedValue(undefined),
    mockLoggerInfo: vi.fn(),
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
      .mockImplementation((_config: unknown, handler: (ctx: object) => Promise<unknown>) => {
        capturedHandler.set(handler);
        return { _config, handler };
      }),
  },
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    harnessRun: {
      findMany: mockHarnessRunFindMany,
      updateMany: mockHarnessRunUpdateMany,
    },
  },
}));

vi.mock('@sentry/nuxt', () => ({
  captureException: mockSentryCaptureException,
}));

vi.mock('~~/server/utils/alerts', () => ({
  sendSlackAlert: mockSendSlackAlert,
}));

const mockLoggerWarn = vi.fn();

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: mockLoggerInfo, error: mockLoggerError, warn: mockLoggerWarn },
}));

// Déclenche la registration du handler
await import('~~/server/inngest/cleanupStaleRuns');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function callHandler() {
  const handler = capturedHandler.get();
  if (!handler) {
    throw new Error('Handler not captured');
  }
  return handler({});
}

const STALE_RUN = {
  id: 'run-uuid-1',
  status: 'QUEUED' as const,
  submissionId: 'sub-uuid-1',
  createdAt: new Date(Date.now() - 10 * 60 * 1_000), // 10 min ago
  startedAt: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('cleanupStaleRuns — aucun run bloqué', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHarnessRunFindMany.mockResolvedValue([]);
  });

  it("retourne { expired: 0 } si aucun run n'est bloqué", async () => {
    const result = await callHandler();
    expect(result).toEqual({ expired: 0 });
    expect(mockHarnessRunUpdateMany).not.toHaveBeenCalled();
  });

  it('log info avec count=0', async () => {
    await callHandler();
    expect(mockLoggerInfo).toHaveBeenCalledWith({ count: 0 }, 'harness.cleanup.no_stale_runs');
  });
});

describe('cleanupStaleRuns — runs bloqués sous le seuil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHarnessRunFindMany.mockResolvedValue([STALE_RUN, { ...STALE_RUN, id: 'run-uuid-2' }]);
    mockHarnessRunUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('marque les runs TIMEOUT via updateMany avec guard de statut', async () => {
    await callHandler();
    expect(mockHarnessRunUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['run-uuid-1', 'run-uuid-2'] },
          status: { in: ['QUEUED', 'RUNNING'] },
        },
        data: expect.objectContaining({ status: 'TIMEOUT' }),
      }),
    );
  });

  it('retourne { expired: 2 }', async () => {
    const result = await callHandler();
    expect(result).toEqual({ expired: 2 });
  });

  it("n'envoie pas d'alerte si count ≤ DLQ_ALERT_THRESHOLD (5)", async () => {
    await callHandler();
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
    expect(mockSendSlackAlert).not.toHaveBeenCalled();
  });
});

describe('cleanupStaleRuns — runs bloqués au-dessus du seuil (DLQ alert)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sixRuns = Array.from({ length: 6 }, (_, i) => ({ ...STALE_RUN, id: `run-${i}` }));
    mockHarnessRunFindMany.mockResolvedValue(sixRuns);
    mockHarnessRunUpdateMany.mockResolvedValue({ count: 6 });
  });

  it('capture une exception Sentry de niveau fatal', async () => {
    await callHandler();
    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ level: 'fatal' }),
    );
  });

  it('envoie une alerte Slack critique', async () => {
    await callHandler();
    expect(mockSendSlackAlert).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
    );
  });

  it('log warn avec les run IDs', async () => {
    await callHandler();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ count: 6 }),
      'harness.cleanup.stale_runs_expired',
    );
  });
});

describe('cleanupStaleRuns — runs RUNNING expirés', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const runningRun = {
      ...STALE_RUN,
      status: 'RUNNING' as const,
      startedAt: new Date(Date.now() - 25 * 60 * 1_000), // 25 min ago
    };
    mockHarnessRunFindMany.mockResolvedValue([runningRun]);
    mockHarnessRunUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('marque les runs RUNNING expirés en TIMEOUT', async () => {
    const result = await callHandler();
    expect(result).toEqual({ expired: 1 });
    expect(mockHarnessRunUpdateMany).toHaveBeenCalledOnce();
  });
});

describe('cleanupStaleRuns — propagation exception DB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHarnessRunFindMany.mockResolvedValue([STALE_RUN]);
    mockHarnessRunUpdateMany.mockRejectedValue(new Error('DB connection lost'));
  });

  it("propage l'exception si updateMany échoue", async () => {
    await expect(callHandler()).rejects.toThrow('DB connection lost');
  });

  it("n'appelle pas les alertes si findMany réussit mais updateMany échoue", async () => {
    await expect(callHandler()).rejects.toThrow();
    expect(mockSentryCaptureException).not.toHaveBeenCalled();
    expect(mockSendSlackAlert).not.toHaveBeenCalled();
  });
});
