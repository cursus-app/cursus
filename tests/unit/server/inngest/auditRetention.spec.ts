// @vitest-environment node
//
// Tests unitaires pour server/inngest/audit-retention.ts — ST-08.4
//
// Stratégie : mock Inngest + Prisma. On extrait le handler via createFunction
// et on l'appelle avec un mock step pour vérifier la logique de coupure.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaDeleteMany, mockLoggerInfo, capturedHandler } = vi.hoisted(() => {
  let capturedHandler:
    | ((ctx: {
        step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
      }) => Promise<unknown>)
    | null = null;

  return {
    mockPrismaDeleteMany: vi.fn(),
    mockLoggerInfo: vi.fn(),
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
      .mockImplementation(
        (
          _config: unknown,
          handler: (ctx: {
            step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
          }) => Promise<unknown>,
        ) => {
          capturedHandler.set(handler);
          return { _config, handler };
        },
      ),
  },
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    auditLog: { deleteMany: mockPrismaDeleteMany },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: mockLoggerInfo, warn: vi.fn(), error: vi.fn() },
}));

async function runHandler() {
  const handler = capturedHandler.get();
  if (!handler) {
    throw new Error('Handler not captured — import audit-retention first');
  }

  const mockStep = {
    run: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };

  return handler({ step: mockStep });
}

describe('auditRetentionFunction', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Re-import to re-register the function with the fresh mock
    await import('~~/server/inngest/audit-retention');
  });

  it('deletes entries older than 12 months', async () => {
    mockPrismaDeleteMany.mockResolvedValue({ count: 42 });

    await runHandler();

    expect(mockPrismaDeleteMany).toHaveBeenCalledOnce();
    const callArgs = mockPrismaDeleteMany.mock.calls[0]?.[0];
    const cutoff: Date = callArgs?.where?.createdAt?.lt;

    expect(cutoff).toBeInstanceOf(Date);

    const expectedCutoff = new Date();
    expectedCutoff.setMonth(expectedCutoff.getMonth() - 12);
    // Allow 5-second margin for test execution time
    expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(5_000);
  });

  it('returns the deleted count and cutoff date', async () => {
    mockPrismaDeleteMany.mockResolvedValue({ count: 7 });

    const result = (await runHandler()) as { deleted: number; cutoffDate: Date };

    expect(result.deleted).toBe(7);
    expect(result.cutoffDate).toBeInstanceOf(Date);
  });

  it('logs completion with deleted count', async () => {
    mockPrismaDeleteMany.mockResolvedValue({ count: 3 });

    await runHandler();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ deleted: 3, retentionMonths: 12 }),
      'audit.retention.completed',
    );
  });

  it('returns 0 deleted when no old entries exist', async () => {
    mockPrismaDeleteMany.mockResolvedValue({ count: 0 });

    const result = (await runHandler()) as { deleted: number };

    expect(result.deleted).toBe(0);
  });
});
