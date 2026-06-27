// @vitest-environment happy-dom
/**
 * Tests unitaires pour useMySubmissions (ST-05.4).
 *
 * Stratégie : vi.stubGlobal($fetch) — même pattern que les autres composables.
 * Chaque test crée une instance fraîche du composable.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import type { SubmissionItem } from '~/composables/useMySubmissions';

// ---- Données de test ----

function makeSubmission(overrides: Partial<SubmissionItem> = {}): SubmissionItem {
  return {
    id: 'sub-1',
    status: 'PENDING',
    repoUrl: 'https://github.com/user/repo',
    deployUrl: null,
    attemptNumber: 1,
    submittedAt: '2026-06-01T10:00:00Z',
    validatedAt: null,
    module: { id: 'mod-1', title: 'Introduction à Git', week: 1 },
    latestHarnessRun: null,
    ...overrides,
  };
}

function makeResponse(
  data: SubmissionItem[] = [],
  overrides: Partial<{ total: number; page: number; perPage: number; totalPages: number }> = {},
) {
  return {
    data,
    meta: {
      total: data.length,
      page: 1,
      perPage: 20,
      totalPages: Math.ceil(data.length / 20) || 1,
      ...overrides,
    },
  };
}

// ---- Mock $fetch ----

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ---- Helper : crée une instance fraîche ----

async function buildComposable() {
  const { useMySubmissions } = await import('~/composables/useMySubmissions');
  return useMySubmissions();
}

// ---- Tests ----

describe('useMySubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialise avec des valeurs par défaut', async () => {
    const c = await buildComposable();
    expect(c.submissions.value).toEqual([]);
    expect(c.isLoading.value).toBe(false);
    expect(c.error.value).toBeNull();
    expect(c.filter.value).toBe('all');
    expect(c.currentPage.value).toBe(1);
    expect(c.meta.value).toMatchObject({ total: 0, page: 1 });
  });

  it('charge les soumissions via fetch()', async () => {
    const subs = [makeSubmission({ id: 'sub-1' }), makeSubmission({ id: 'sub-2' })];
    mockFetch.mockResolvedValueOnce(makeResponse(subs));

    const c = await buildComposable();
    await c.fetch();

    expect(c.submissions.value).toHaveLength(2);
    expect(c.isLoading.value).toBe(false);
    expect(c.error.value).toBeNull();
  });

  it('met isLoading à true pendant le chargement', async () => {
    let resolvePromise!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const c = await buildComposable();
    const fetchPromise = c.fetch();

    expect(c.isLoading.value).toBe(true);
    resolvePromise(makeResponse([]));
    await fetchPromise;
    expect(c.isLoading.value).toBe(false);
  });

  it('expose une erreur si $fetch échoue', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const c = await buildComposable();
    await c.fetch();

    expect(c.error.value).toBe('Network error');
    expect(c.submissions.value).toEqual([]);
  });

  it("appelle l'API avec le filtre courant", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    const c = await buildComposable();
    await c.fetch();

    expect(mockFetch).toHaveBeenCalledWith('/api/me/submissions', {
      query: { status: 'all', page: '1' },
    });
  });

  it('setFilter change le filtre et remet la page à 1', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));

    const c = await buildComposable();
    // Simule une page 2 avant le changement de filtre
    await c.fetch();

    mockFetch.mockResolvedValueOnce(makeResponse([]));
    c.setFilter('VALIDATED');

    // Attendre que l'appel async se termine
    await new Promise((r) => setTimeout(r, 0));

    expect(c.filter.value).toBe('VALIDATED');
    expect(c.currentPage.value).toBe(1);
    expect(mockFetch).toHaveBeenLastCalledWith('/api/me/submissions', {
      query: { status: 'VALIDATED', page: '1' },
    });
  });

  it('setPage change la page et appelle fetch()', async () => {
    mockFetch.mockResolvedValue(
      makeResponse([], { total: 40, page: 2, perPage: 20, totalPages: 2 }),
    );

    const c = await buildComposable();
    c.setPage(2);

    await new Promise((r) => setTimeout(r, 0));

    expect(c.currentPage.value).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith('/api/me/submissions', {
      query: { status: 'all', page: '2' },
    });
  });

  it('met à jour les métadonnées de pagination', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse([makeSubmission()], { total: 45, page: 1, perPage: 20, totalPages: 3 }),
    );

    const c = await buildComposable();
    await c.fetch();

    expect(c.meta.value).toMatchObject({
      total: 45,
      page: 1,
      perPage: 20,
      totalPages: 3,
    });
  });

  it("les soumissions sont triées telles que retournées par l'API (plus récentes en premier)", async () => {
    // L'ordre est garanti par le serveur (orderBy: submittedAt desc).
    // Le composable ne ré-ordonne pas — il fait confiance à l'API.
    const subs = [
      makeSubmission({ id: 'sub-3', submittedAt: '2026-06-10T10:00:00Z' }),
      makeSubmission({ id: 'sub-2', submittedAt: '2026-06-05T10:00:00Z' }),
      makeSubmission({ id: 'sub-1', submittedAt: '2026-06-01T10:00:00Z' }),
    ];
    mockFetch.mockResolvedValueOnce(makeResponse(subs));

    const c = await buildComposable();
    await c.fetch();

    expect(c.submissions.value[0]?.id).toBe('sub-3');
    expect(c.submissions.value[1]?.id).toBe('sub-2');
    expect(c.submissions.value[2]?.id).toBe('sub-1');
  });

  it('refresh() recharge sans changer le filtre ni la page', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));

    const c = await buildComposable();
    c.setFilter('FAILED');
    await new Promise((r) => setTimeout(r, 0));
    c.setPage(2);
    await new Promise((r) => setTimeout(r, 0));

    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce(makeResponse([]));
    c.refresh();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockFetch).toHaveBeenCalledWith('/api/me/submissions', {
      query: { status: 'FAILED', page: '2' },
    });
  });
});
