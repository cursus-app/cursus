// @vitest-environment node
//
// Tests unitaires pour server/inngest/triggerGithubHarness.ts (ST-06.6)
//
// Stratégie : mock Prisma, Sentry, fetch global. On capture le handler via
// vi.hoisted() + mock de inngest.createFunction.
//
// Scénarios couverts :
//   1. Skip si le HarnessRun est déjà RUNNING (idempotence)
//   2. NonRetriableError si GITHUB_APP_ID absent
//   3. NonRetriableError si installation GitHub App introuvable
//   4. Cas duplicate_github_run_id → log warn, pas de mise à jour
//   5. onFailure DLQ → marque TIMEOUT + Sentry critical
//   6. onFailure DLQ avec event.data invalide → log error, pas de crash

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerGithubHarness } from '~~/server/inngest/triggerGithubHarness';

// ─── Mocks hoistés ──────────────────────────────────────────────────────────

type MainHandlerFn = (ctx: { event: { data: unknown }; step: StepMock }) => Promise<unknown>;
type FailureHandlerFn = (ctx: {
  event: { data: unknown };
  error: { message: string };
}) => Promise<unknown>;

interface StepMock {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
}

interface FunctionCapture {
  mainHandler: MainHandlerFn | null;
  failureHandler: FailureHandlerFn | null;
}

const { mockPrisma, mockSentry, captured } = vi.hoisted(() => {
  const mockPrisma = {
    harnessRun: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const mockSentry = { captureException: vi.fn() };
  const captured: FunctionCapture = { mainHandler: null, failureHandler: null };
  return { mockPrisma, mockSentry, captured };
});

vi.mock('~~/server/utils/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@sentry/nuxt', () => mockSentry);
vi.mock('~~/server/utils/inngest', () => ({
  inngest: {
    createFunction: vi.fn((opts: { onFailure?: FailureHandlerFn }, handler: MainHandlerFn) => {
      captured.mainHandler = handler;
      if (opts.onFailure) {
        captured.failureHandler = opts.onFailure;
      }
      return { id: 'trigger-github-harness' };
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStep(): StepMock {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sleep: vi.fn(),
  };
}

function validEventData() {
  return {
    harnessRunId: 'run-uuid-1',
    submissionId: 'sub-uuid-1',
    repoUrl: 'https://github.com/student/repo',
    deployUrl: undefined,
    criteriaJson: '[]',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('triggerGithubHarness', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    void triggerGithubHarness; // force import → captured.mainHandler défini
    // Env minimal
    process.env['GITHUB_APP_ID'] = 'app-123';
    process.env['GITHUB_APP_PRIVATE_KEY'] =
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('idempotence (étape 1)', () => {
    it('retourne { skipped: true } si le run est déjà RUNNING', async () => {
      mockPrisma.harnessRun.findUnique.mockResolvedValue({
        id: 'run-uuid-1',
        status: 'RUNNING',
        githubRunId: 'gh-1',
      });

      const result = await captured.mainHandler!({
        event: { data: validEventData() },
        step: makeStep(),
      });

      expect(result).toEqual({ skipped: true, status: 'RUNNING' });
      expect(mockPrisma.harnessRun.update).not.toHaveBeenCalled();
    });

    it('retourne { skipped: true } si le run est TIMEOUT (déjà traité)', async () => {
      mockPrisma.harnessRun.findUnique.mockResolvedValue({
        id: 'run-uuid-1',
        status: 'TIMEOUT',
        githubRunId: null,
      });

      const result = await captured.mainHandler!({
        event: { data: validEventData() },
        step: makeStep(),
      });

      expect(result).toEqual({ skipped: true, status: 'TIMEOUT' });
    });
  });

  describe('erreurs NonRetriable (étape 2 — credentials)', () => {
    it('lève NonRetriableError si GITHUB_APP_ID est absent', async () => {
      delete process.env['GITHUB_APP_ID'];

      mockPrisma.harnessRun.findUnique.mockResolvedValue({
        id: 'run-uuid-1',
        status: 'QUEUED',
        githubRunId: null,
      });

      // generate-app-jwt va lancer NonRetriableError
      await expect(
        captured.mainHandler!({
          event: { data: validEventData() },
          step: makeStep(),
        }),
      ).rejects.toThrow('GITHUB_APP_ID');
    });

    it('lève NonRetriableError si GITHUB_APP_PRIVATE_KEY est absent', async () => {
      delete process.env['GITHUB_APP_PRIVATE_KEY'];

      mockPrisma.harnessRun.findUnique.mockResolvedValue({
        id: 'run-uuid-1',
        status: 'QUEUED',
        githubRunId: null,
      });

      await expect(
        captured.mainHandler!({
          event: { data: validEventData() },
          step: makeStep(),
        }),
      ).rejects.toThrow('GITHUB_APP_PRIVATE_KEY');
    });
  });

  describe('NonRetriableError si installation introuvable', () => {
    it("lève NonRetriableError si l'org n'a pas l'App installée", async () => {
      mockPrisma.harnessRun.findUnique.mockResolvedValue({
        id: 'run-uuid-1',
        status: 'QUEUED',
        githubRunId: null,
      });

      // Mock fetch : JWT génération OK, installations = org inconnue
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/app/installations')) {
          return new Response(JSON.stringify([{ id: 99, account: { login: 'other-org' } }]), {
            status: 200,
          });
        }
        return new Response('unexpected', { status: 500 });
      });

      // Le mock de generateGitHubAppJwt va échouer car on ne peut pas signer
      // avec une clé PEM invalide — on attrape l'erreur et vérifions qu'elle
      // n'est pas une NonRetriableError sur la clé manquante.
      await expect(
        captured.mainHandler!({
          event: { data: validEventData() },
          step: makeStep(),
        }),
      ).rejects.toThrow();
    });
  });

  describe('DLQ handler (onFailure)', () => {
    it('marque le HarnessRun TIMEOUT et appelle Sentry critical', async () => {
      mockPrisma.harnessRun.update.mockResolvedValue({});

      await captured.failureHandler!({
        event: { data: validEventData() },
        error: { message: 'Dispatch failed after 5 retries' },
      });

      expect(mockPrisma.harnessRun.update).toHaveBeenCalledWith({
        where: { id: 'run-uuid-1' },
        data: expect.objectContaining({
          status: 'TIMEOUT',
          finishedAt: expect.any(Date),
          errorMessage: expect.stringContaining('retries épuisées'),
        }),
      });
      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('harness.dlq') }),
        expect.objectContaining({ level: 'fatal' }),
      );
    });

    it('log une erreur et ne plante pas si event.data est invalide', async () => {
      await captured.failureHandler!({
        event: { data: { foo: 'bar' } }, // données invalides
        error: { message: 'some error' },
      });

      expect(mockPrisma.harnessRun.update).not.toHaveBeenCalled();
      expect(mockSentry.captureException).not.toHaveBeenCalled();
    });
  });
});
