// @vitest-environment node
//
// Tests unitaires — POST /api/harness/webhook (ST-06.1)
// Couvre : vérification HMAC, idempotence, mise à jour DB.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

// ─── Helpers HMAC (version synchrone node:crypto pour les tests) ──────────────

/**
 * Calcule la signature HMAC-SHA256 compatible avec le handler de production.
 * (Le handler utilise WebCrypto, les tests peuvent utiliser node:crypto native.)
 */
function signPayload(secret: string, body: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

// ─── Tests HMAC unitaires purs (sans I/O) ────────────────────────────────────

describe('HMAC signature verification (unit)', () => {
  const secret = 'test-webhook-secret-32chars-min!!';

  it('produit une signature sha256= pour un corps donné', () => {
    const sig = signPayload(secret, '{"hello":"world"}');
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('deux corps différents produisent des signatures différentes', () => {
    const sig1 = signPayload(secret, '{"a":1}');
    const sig2 = signPayload(secret, '{"a":2}');
    expect(sig1).not.toBe(sig2);
  });

  it('même corps + même secret → même signature (déterministe)', () => {
    const body = '{"run_id":"abc123"}';
    expect(signPayload(secret, body)).toBe(signPayload(secret, body));
  });

  it('secrets différents → signatures différentes (isolation)', () => {
    const body = '{"run_id":"abc123"}';
    expect(signPayload('secret-A', body)).not.toBe(signPayload('secret-B', body));
  });
});

// ─── Tests du handler (avec mocks) ───────────────────────────────────────────

// Mocks globaux Nitro/H3
const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message);
  // @ts-expect-error — H3Error properties not on standard Error, needed for H3 compatibility
  err.statusCode = opts.statusCode;
  // @ts-expect-error — H3Error properties not on standard Error, needed for H3 compatibility
  err.data = opts.data;
  return err;
});

vi.stubGlobal('createError', mockCreateError);
vi.stubGlobal('defineEventHandler', (fn: (...args: unknown[]) => unknown) => fn);

const mockReadRawBody = vi.fn();
vi.stubGlobal('readRawBody', mockReadRawBody);

const mockGetHeader = vi.fn();
vi.stubGlobal('getHeader', mockGetHeader);

// Mocks DB
const mockHarnessRunFindUnique = vi.fn();
const mockHarnessRunFindFirst = vi.fn();
const mockHarnessRunUpdate = vi.fn();
const mockSubmissionFindUnique = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockCohortModuleFindFirst = vi.fn();
const mockProgressionUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    harnessRun: {
      findUnique: mockHarnessRunFindUnique,
      findFirst: mockHarnessRunFindFirst,
      update: mockHarnessRunUpdate,
    },
    submission: {
      findUnique: mockSubmissionFindUnique,
      update: mockSubmissionUpdate,
    },
    cohortModule: { findFirst: mockCohortModuleFindFirst },
    progression: { updateMany: mockProgressionUpdateMany },
    $transaction: mockTransaction,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Payload valide par défaut ─────────────────────────────────────────────────

const WEBHOOK_SECRET = 'super-secret-hmac-key-for-tests!!';

const validPayload = {
  run_id: 'github-run-12345',
  workflow_url: 'https://github.com/cursus-dev/cursus-harness-runner/actions/runs/12345',
  submission_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  status: 'success' as const,
  checks: [
    { check_id: 'repo_exists_public', status: 'success' as const, message: 'Repo is public' },
    { check_id: 'tests_pass', status: 'success' as const, message: 'All tests passed' },
  ],
  started_at: '2026-06-01T10:00:00.000Z',
  finished_at: '2026-06-01T10:05:00.000Z',
};

/** Construit un faux event H3 avec corps et signature. */
function makeEvent(payload: unknown, secret?: string) {
  const body = JSON.stringify(payload);
  const sig = secret ? signPayload(secret, body) : undefined;

  mockReadRawBody.mockResolvedValue(body);
  mockGetHeader.mockImplementation((_event: unknown, header: string) => {
    if (header === 'x-harness-signature') {
      return sig;
    }
    if (header === 'x-hub-signature-256') {
      return sig;
    }
    return undefined;
  });
  process.env['GITHUB_APP_WEBHOOK_SECRET'] = secret ?? '';

  return {}; // event factice (non utilisé directement)
}

// ─── Import du handler ────────────────────────────────────────────────────────

// Le handler est exporté comme default par Nuxt/Nitro
const getHandler = async () => {
  const mod = await import('~~/server/api/harness/webhook.post');
  return mod.default as (event: unknown) => Promise<unknown>;
};

// ─── Tests du handler ────────────────────────────────────────────────────────

describe('POST /api/harness/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env['GITHUB_APP_WEBHOOK_SECRET'] = WEBHOOK_SECRET;

    // Par défaut : run trouvé en RUNNING
    mockHarnessRunFindUnique.mockResolvedValue({
      id: 'harness-run-id-1',
      status: 'RUNNING',
      submissionId: validPayload.submission_id,
    });
    mockHarnessRunFindFirst.mockResolvedValue(null);

    // $transaction exécute le callback
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        harnessRun: {
          update: mockHarnessRunUpdate,
        },
        submission: {
          findUnique: mockSubmissionFindUnique,
          update: mockSubmissionUpdate,
        },
        cohortModule: { findFirst: mockCohortModuleFindFirst },
        progression: { updateMany: mockProgressionUpdateMany },
      };
      return fn(tx);
    });

    mockHarnessRunUpdate.mockResolvedValue({
      id: 'harness-run-id-1',
      submissionId: validPayload.submission_id,
    });
    mockSubmissionUpdate.mockResolvedValue({});
    mockSubmissionFindUnique.mockResolvedValue({
      userId: 'user-id-1',
      moduleId: 'module-id-1',
    });
    mockCohortModuleFindFirst.mockResolvedValue({ id: 'cm-id-1' });
    mockProgressionUpdateMany.mockResolvedValue({ count: 1 });
  });

  describe('Vérification HMAC', () => {
    it('accepte une requête avec signature valide', async () => {
      const handler = await getHandler();
      makeEvent(validPayload, WEBHOOK_SECRET);

      const result = await handler({});
      expect(result).toEqual({ ok: true });
    });

    it('rejette avec 401 si la signature est invalide', async () => {
      const handler = await getHandler();
      const body = JSON.stringify(validPayload);
      mockReadRawBody.mockResolvedValue(body);
      mockGetHeader.mockReturnValue('sha256=invalide_signature_aaaaaaaaaaaaaaaaaaaaaa');

      await expect(handler({})).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejette avec 401 si la signature est absente', async () => {
      const handler = await getHandler();
      const body = JSON.stringify(validPayload);
      mockReadRawBody.mockResolvedValue(body);
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler({})).rejects.toMatchObject({ statusCode: 401 });
    });

    it("accepte sans vérification HMAC si le secret n'est pas configuré", async () => {
      process.env['GITHUB_APP_WEBHOOK_SECRET'] = '';
      const handler = await getHandler();
      const body = JSON.stringify(validPayload);
      mockReadRawBody.mockResolvedValue(body);
      mockGetHeader.mockReturnValue(undefined);

      const result = await handler({});
      expect(result).toEqual({ ok: true });
    });
  });

  describe('Idempotence', () => {
    it('ignore un run déjà traité (SUCCESS)', async () => {
      const handler = await getHandler();
      mockHarnessRunFindUnique.mockResolvedValue({
        id: 'harness-run-id-1',
        status: 'SUCCESS',
        submissionId: validPayload.submission_id,
      });
      makeEvent(validPayload, WEBHOOK_SECRET);

      const result = await handler({});
      expect(result).toEqual(expect.objectContaining({ ok: true }));
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('ignore un run déjà traité (FAILURE)', async () => {
      const handler = await getHandler();
      mockHarnessRunFindUnique.mockResolvedValue({
        id: 'harness-run-id-1',
        status: 'FAILURE',
        submissionId: validPayload.submission_id,
      });
      makeEvent(validPayload, WEBHOOK_SECRET);

      const result = await handler({});
      expect(result).toEqual(expect.objectContaining({ ok: true }));
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Mise à jour DB', () => {
    it('met à jour le HarnessRun en SUCCESS', async () => {
      const handler = await getHandler();
      makeEvent(validPayload, WEBHOOK_SECRET);

      await handler({});

      expect(mockHarnessRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCESS',
            githubRunId: validPayload.run_id,
            githubWorkflowUrl: validPayload.workflow_url,
          }),
        }),
      );
    });

    it('met à jour le HarnessRun en FAILURE pour un webhook "failure"', async () => {
      const handler = await getHandler();
      const failPayload = { ...validPayload, status: 'failure' as const };
      makeEvent(failPayload, WEBHOOK_SECRET);

      await handler({});

      expect(mockHarnessRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILURE' }),
        }),
      );
    });

    it('met à jour la Submission en VALIDATED pour un webhook "success"', async () => {
      const handler = await getHandler();
      makeEvent(validPayload, WEBHOOK_SECRET);

      await handler({});

      expect(mockSubmissionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VALIDATED' }),
        }),
      );
    });

    it('stocke les checksJson dans HarnessRun', async () => {
      const handler = await getHandler();
      makeEvent(validPayload, WEBHOOK_SECRET);

      await handler({});

      expect(mockHarnessRunUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checksJson: { checks: validPayload.checks },
          }),
        }),
      );
    });
  });

  describe('Validation du payload', () => {
    it('rejette avec 400 si le corps est vide', async () => {
      const handler = await getHandler();
      mockReadRawBody.mockResolvedValue(null);

      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejette avec 400 si le JSON est invalide', async () => {
      const handler = await getHandler();
      process.env['GITHUB_APP_WEBHOOK_SECRET'] = '';
      mockReadRawBody.mockResolvedValue('not-json');
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejette avec 400 si le payload est invalide (champ manquant)', async () => {
      const handler = await getHandler();
      const incompletePayload = { run_id: 'abc' }; // manque submission_id etc.
      process.env['GITHUB_APP_WEBHOOK_SECRET'] = '';
      mockReadRawBody.mockResolvedValue(JSON.stringify(incompletePayload));
      mockGetHeader.mockReturnValue(undefined);

      await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
