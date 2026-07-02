// @vitest-environment node
//
// Tests unitaires pour server/inngest/cleanupStaleRuns.ts (ST-06.6)
//
// Stratégie : mock Prisma + Sentry. On extrait le handler directement
// en mockant inngest.createFunction pour capturer le callback.
//
// Scénarios couverts :
//   1. Aucun run stale → retour { timedOut: 0 }, aucune mise à jour
//   2. Runs RUNNING > 10 min → marqués TIMEOUT + errorMessage
//   3. Runs QUEUED > 30 min → marqués TIMEOUT + errorMessage
//   4. Batch ≥ 5 runs → Sentry.captureException level fatal
//   5. Batch < 5 runs → pas d'alerte Sentry
//   6. Mix RUNNING + QUEUED simultanément

import { describe, it, expect, vi, beforeEach } from 'vitest';
// vi.mock est hoisted à la compilation → l'import ci-dessous utilisera les mocks
import { cleanupStaleRuns } from '~~/server/inngest/cleanupStaleRuns';

// ─── Mocks hoistés ──────────────────────────────────────────────────────────

// vi.hoisted() garantit que ces valeurs sont disponibles dans les factories
// de vi.mock (qui s'exécutent avant toute initialisation de module).
type HandlerFn = (ctx: { event: unknown; step: unknown }) => Promise<unknown>;

const { mockPrisma, mockSentry, captured } = vi.hoisted(() => {
  const mockPrisma = {
    harnessRun: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
  const mockSentry = { captureException: vi.fn() };
  const captured: { handler: HandlerFn | null } = { handler: null };
  return { mockPrisma, mockSentry, captured };
});

vi.mock('~~/server/utils/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@sentry/nuxt', () => mockSentry);
vi.mock('~~/server/utils/inngest', () => ({
  inngest: {
    createFunction: vi.fn((_opts: unknown, handler: HandlerFn) => {
      captured.handler = handler;
      return { id: 'harness.cleanup.stale-runs' };
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRunningRun(minutesAgo: number) {
  return {
    id: `run-running-${minutesAgo}`,
    submissionId: `sub-${minutesAgo}`,
    githubRunId: `gh-${minutesAgo}`,
    startedAt: new Date(Date.now() - minutesAgo * 60_000),
  };
}

function makeQueuedRun(minutesAgo: number) {
  return {
    id: `run-queued-${minutesAgo}`,
    submissionId: `sub-q-${minutesAgo}`,
    createdAt: new Date(Date.now() - minutesAgo * 60_000),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('cleanupStaleRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    void cleanupStaleRuns; // force l'évaluation du module → captured.handler est défini
  });

  it('ne fait rien si aucun run stale', async () => {
    mockPrisma.harnessRun.findMany.mockResolvedValue([]);

    const result = await captured.handler!({ event: {}, step: {} });

    expect(result).toEqual({ timedOut: 0 });
    expect(mockPrisma.harnessRun.updateMany).not.toHaveBeenCalled();
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('marque les runs RUNNING > 10 min comme TIMEOUT', async () => {
    const staleRun = makeRunningRun(15);

    mockPrisma.harnessRun.findMany
      .mockResolvedValueOnce([staleRun]) // staleRunning
      .mockResolvedValueOnce([]); // staleQueued
    mockPrisma.harnessRun.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.harnessRun.update.mockResolvedValue({});

    const result = await captured.handler!({ event: {}, step: {} });

    expect(result).toEqual({ timedOut: 1, running: 1, queued: 0 });
    expect(mockPrisma.harnessRun.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [staleRun.id] } },
      data: { status: 'TIMEOUT', finishedAt: expect.any(Date) },
    });
    expect(mockPrisma.harnessRun.update).toHaveBeenCalledWith({
      where: { id: staleRun.id },
      data: { errorMessage: expect.stringContaining('webhook perdu') },
    });
  });

  it('marque les runs QUEUED > 30 min comme TIMEOUT', async () => {
    const staleQueued = makeQueuedRun(45);

    mockPrisma.harnessRun.findMany
      .mockResolvedValueOnce([]) // staleRunning
      .mockResolvedValueOnce([staleQueued]); // staleQueued
    mockPrisma.harnessRun.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.harnessRun.update.mockResolvedValue({});

    const result = await captured.handler!({ event: {}, step: {} });

    expect(result).toEqual({ timedOut: 1, running: 0, queued: 1 });
    expect(mockPrisma.harnessRun.update).toHaveBeenCalledWith({
      where: { id: staleQueued.id },
      data: { errorMessage: expect.stringContaining('événement Inngest') },
    });
  });

  it('déclenche Sentry critical si batch ≥ 5 runs (seuil DLQ)', async () => {
    const staleRuns = Array.from({ length: 5 }, (_, i) => makeRunningRun(12 + i));

    mockPrisma.harnessRun.findMany.mockResolvedValueOnce(staleRuns).mockResolvedValueOnce([]);
    mockPrisma.harnessRun.updateMany.mockResolvedValue({ count: 5 });
    mockPrisma.harnessRun.update.mockResolvedValue({});

    await captured.handler!({ event: {}, step: {} });

    expect(mockSentry.captureException).toHaveBeenCalledOnce();
    expect(mockSentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('5 runs bloqués') }),
      expect.objectContaining({ level: 'fatal' }),
    );
  });

  it("n'appelle pas Sentry si batch < 5 runs", async () => {
    const staleRuns = Array.from({ length: 3 }, (_, i) => makeRunningRun(12 + i));

    mockPrisma.harnessRun.findMany.mockResolvedValueOnce(staleRuns).mockResolvedValueOnce([]);
    mockPrisma.harnessRun.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.harnessRun.update.mockResolvedValue({});

    await captured.handler!({ event: {}, step: {} });

    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('gère les runs RUNNING + QUEUED simultanément', async () => {
    const staleRunning = makeRunningRun(12);
    const staleQueued = makeQueuedRun(35);

    mockPrisma.harnessRun.findMany
      .mockResolvedValueOnce([staleRunning])
      .mockResolvedValueOnce([staleQueued]);
    mockPrisma.harnessRun.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.harnessRun.update.mockResolvedValue({});

    const result = await captured.handler!({ event: {}, step: {} });

    expect(result).toEqual({ timedOut: 2, running: 1, queued: 1 });
    expect(mockPrisma.harnessRun.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [staleRunning.id, staleQueued.id] } },
      data: { status: 'TIMEOUT', finishedAt: expect.any(Date) },
    });
  });
});
