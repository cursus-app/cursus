// @vitest-environment happy-dom
//
// Tests unitaires pour le composable useCohorte (ST-04.1).
// Stratégie : mockNuxtImport intercepte les auto-imports (useT, useAnalytics),
//             vi.stubGlobal mock le $fetch global de Nuxt.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

// ─── Mocks des auto-imports Nuxt ─────────────────────────────────────────────

const mockT = vi.fn((key: string) => key);
mockNuxtImport('useT', () => () => ({
  t: mockT,
  locale: { value: 'fr' },
  setLocale: vi.fn(),
  locales: { value: [] },
}));

const mockTrack = vi.fn();
mockNuxtImport('useAnalytics', () => () => ({
  track: mockTrack,
}));

// ─── Mock $fetch global ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ─── Données de test ──────────────────────────────────────────────────────────

const COHORTE_LIST_RESPONSE = {
  data: [
    {
      id: 'cohorte-1',
      name: 'Promo Automne 2026',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      rhythm: 'WEEKLY',
      status: 'DRAFT',
      createdAt: '2026-06-01T00:00:00Z',
      cursusVersion: {
        id: 'version-1',
        version: 1,
        cursus: { id: 'cursus-1', title: 'Dev Web', slug: 'dev-web' },
      },
      _count: { memberships: 0 },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const COHORTE_FULL = {
  id: 'cohorte-1',
  name: 'Promo Automne 2026',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  rhythm: 'WEEKLY',
  status: 'DRAFT',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  archivedAt: null,
  cursusVersion: {
    id: 'version-1',
    version: 1,
    cursus: { id: 'cursus-1', title: 'Dev Web', slug: 'dev-web' },
  },
  memberships: [],
  _count: { memberships: 0 },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCohorte — listCohortes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches GET /api/cohortes without query', async () => {
    mockFetch.mockResolvedValue(COHORTE_LIST_RESPONSE);

    const { useCohorte } = await import('~/composables/useCohorte');
    const { listCohortes } = useCohorte();
    const result = await listCohortes();

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes', {});
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('passes status filter in query', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_LIST_RESPONSE, data: [] });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { listCohortes } = useCohorte();
    await listCohortes({ status: 'ACTIVE' });

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes', {
      query: { status: 'ACTIVE' },
    });
  });

  it('sets loading to true during fetch and false after', async () => {
    mockFetch.mockResolvedValue(COHORTE_LIST_RESPONSE);

    const { useCohorte } = await import('~/composables/useCohorte');
    const { listCohortes, loading } = useCohorte();

    expect(loading.value).toBe(false);
    const promise = listCohortes();
    // During the async call, loading is true
    expect(loading.value).toBe(true);
    await promise;
    expect(loading.value).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.notFound' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { listCohortes, error } = useCohorte();

    await expect(listCohortes()).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.notFound');
  });

  it('falls back to t("errors.generic") when error has no data.message', async () => {
    mockFetch.mockRejectedValue({ status: 500 });
    mockT.mockReturnValue('errors.generic');

    const { useCohorte } = await import('~/composables/useCohorte');
    const { listCohortes, error } = useCohorte();

    await expect(listCohortes()).rejects.toBeDefined();
    expect(error.value).toBe('errors.generic');
  });
});

describe('useCohorte — getCohorte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches GET /api/cohortes/:id', async () => {
    mockFetch.mockResolvedValue(COHORTE_FULL);

    const { useCohorte } = await import('~/composables/useCohorte');
    const { getCohorte } = useCohorte();
    const result = await getCohorte('cohorte-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1');
    expect(result.id).toBe('cohorte-1');
    expect(result.status).toBe('DRAFT');
  });

  it('sets error on fetch failure (with message)', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.notFound' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { getCohorte, error } = useCohorte();

    await expect(getCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.notFound');
  });

  it('falls back to generic error when no data.message', async () => {
    mockFetch.mockRejectedValue({ status: 500 });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { getCohorte, error } = useCohorte();

    await expect(getCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('errors.generic');
  });
});

describe('useCohorte — createCohorte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /api/cohortes with body', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_FULL, status: 'DRAFT' });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { createCohorte } = useCohorte();
    const body = {
      name: 'Promo Test',
      cursusId: 'cursus-1',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      rhythm: 'WEEKLY' as const,
    };
    await createCohorte(body);

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes', {
      method: 'POST',
      body,
    });
  });

  it('tracks cohorte_created event', async () => {
    mockFetch.mockResolvedValue(COHORTE_FULL);

    const { useCohorte } = await import('~/composables/useCohorte');
    const { createCohorte } = useCohorte();
    await createCohorte({
      name: 'Test',
      cursusId: 'cursus-1',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      rhythm: 'WEEKLY' as const,
    });

    expect(mockTrack).toHaveBeenCalledWith('cohorte_created', { rhythm: 'WEEKLY' });
  });
});

describe('useCohorte — updateCohorte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCHes to /api/cohortes/:id', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_FULL, name: 'Updated Name' });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { updateCohorte } = useCohorte();
    const result = await updateCohorte('cohorte-1', { name: 'Updated Name' });

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1', {
      method: 'PATCH',
      body: { name: 'Updated Name' },
    });
    expect(result.name).toBe('Updated Name');
  });

  it('sets error on fetch failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.notFound' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { updateCohorte, error } = useCohorte();

    await expect(updateCohorte('cohorte-1', { name: 'X' })).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.notFound');
  });
});

describe('useCohorte — deleteCohorte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets error on delete failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.forbidden' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { deleteCohorte, error } = useCohorte();

    await expect(deleteCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.forbidden');
  });
});

describe('useCohorte — state transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('startCohorte POSTs to /start and tracks event', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_FULL, status: 'ACTIVE' });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { startCohorte } = useCohorte();
    const result = await startCohorte('cohorte-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1/start', { method: 'POST' });
    expect(result.status).toBe('ACTIVE');
    expect(mockTrack).toHaveBeenCalledWith('cohorte_started');
  });

  it('completeCohorte POSTs to /complete and tracks event', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_FULL, status: 'COMPLETED' });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { completeCohorte } = useCohorte();
    const result = await completeCohorte('cohorte-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1/complete', { method: 'POST' });
    expect(result.status).toBe('COMPLETED');
    expect(mockTrack).toHaveBeenCalledWith('cohorte_completed');
  });

  it('archiveCohorte POSTs to /archive and tracks event', async () => {
    mockFetch.mockResolvedValue({ ...COHORTE_FULL, status: 'ARCHIVED' });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { archiveCohorte } = useCohorte();
    const result = await archiveCohorte('cohorte-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1/archive', { method: 'POST' });
    expect(result.status).toBe('ARCHIVED');
    expect(mockTrack).toHaveBeenCalledWith('cohorte_archived');
  });

  it('deleteCohorte DELETEs /api/cohortes/:id and tracks event', async () => {
    mockFetch.mockResolvedValue({ success: true });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { deleteCohorte } = useCohorte();
    await deleteCohorte('cohorte-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cohortes/cohorte-1', { method: 'DELETE' });
    expect(mockTrack).toHaveBeenCalledWith('cohorte_deleted');
  });

  it('startCohorte sets error on failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.noStagiaires' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { startCohorte, error } = useCohorte();

    await expect(startCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.noStagiaires');
  });

  it('completeCohorte sets error on failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.cannotCompleteNonActive' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { completeCohorte, error } = useCohorte();

    await expect(completeCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.cannotCompleteNonActive');
  });

  it('archiveCohorte sets error on failure', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'cohortes.errors.cannotArchiveDraft' } });

    const { useCohorte } = await import('~/composables/useCohorte');
    const { archiveCohorte, error } = useCohorte();

    await expect(archiveCohorte('cohorte-1')).rejects.toBeDefined();
    expect(error.value).toBe('cohortes.errors.cannotArchiveDraft');
  });
});
