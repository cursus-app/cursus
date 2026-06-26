// @vitest-environment happy-dom
//
// Tests unitaires pour le composable useCursus (ST-03.1).
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

const CURSUS_LIST_RESPONSE = {
  data: [
    {
      id: 'cursus-1',
      title: 'Web Dev',
      slug: 'web-dev',
      domain: 'dev-web',
      level: 'BEGINNER',
      durationWeeks: 12,
      status: 'PUBLISHED',
      ownerId: 'owner-1',
      createdAt: '2026-01-01T00:00:00Z',
      _count: { modules: 3 },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

const CURSUS_FULL = {
  id: 'cursus-1',
  title: 'Web Dev',
  slug: 'web-dev',
  domain: 'dev-web',
  level: 'BEGINNER',
  durationWeeks: 12,
  description: null,
  prerequisites: null,
  status: 'PUBLISHED',
  ownerId: 'owner-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  _count: { modules: 3, versions: 1 },
  versions: [{ id: 'ver-1', version: 1, publishedAt: '2026-01-01T00:00:00Z' }],
};

const CREATE_INPUT = {
  title: 'New Cursus',
  domain: 'ia' as const,
  level: 'ADVANCED' as const,
  durationWeeks: 8,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCursus — listCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /api/cursus without query params when called with no arguments', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_LIST_RESPONSE);
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus } = useCursus();

    await listCursus();

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus', {});
  });

  it('calls GET /api/cursus with provided query params (status, page, limit)', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_LIST_RESPONSE);
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus } = useCursus();

    await listCursus({ status: 'PUBLISHED', page: 2, limit: 10 });

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus', {
      query: { status: 'PUBLISHED', page: 2, limit: 10 },
    });
  });

  it('strips undefined values from query params before sending', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_LIST_RESPONSE);
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus } = useCursus();

    await listCursus({ page: 1, status: undefined, domain: undefined });

    const callArg = mockFetch.mock.calls[0]?.[1] as { query?: Record<string, unknown> };
    expect(callArg?.query).not.toHaveProperty('status');
    expect(callArg?.query).not.toHaveProperty('domain');
  });

  it('returns the full list response including data, total, page, limit', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_LIST_RESPONSE);
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus } = useCursus();

    const result = await listCursus();

    expect(result).toEqual(CURSUS_LIST_RESPONSE);
  });

  it('sets error.value and rethrows when $fetch rejects', async () => {
    const fetchError = Object.assign(new Error('Network error'), {
      data: { message: 'cursus.errors.notFound' },
    });
    mockFetch.mockRejectedValueOnce(fetchError);

    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus, error } = useCursus();

    await expect(listCursus()).rejects.toThrow();
    expect(error.value).toBe('cursus.errors.notFound');
  });

  it('uses generic error key when fetch error has no message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('generic'));

    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus } = useCursus();

    await expect(listCursus()).rejects.toThrow();
    expect(mockT).toHaveBeenCalledWith('errors.generic');
  });

  it('resets loading to false after success', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_LIST_RESPONSE);
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus, loading } = useCursus();

    await listCursus();
    expect(loading.value).toBe(false);
  });

  it('resets loading to false even after an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    const { useCursus } = await import('~/composables/useCursus');
    const { listCursus, loading } = useCursus();

    await listCursus().catch(() => undefined);
    expect(loading.value).toBe(false);
  });
});

describe('useCursus — getCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /api/cursus/:id with the correct id', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_FULL);
    const { useCursus } = await import('~/composables/useCursus');
    const { getCursus } = useCursus();

    await getCursus('cursus-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus/cursus-1');
  });

  it('returns the full cursus object', async () => {
    mockFetch.mockResolvedValueOnce(CURSUS_FULL);
    const { useCursus } = await import('~/composables/useCursus');
    const { getCursus } = useCursus();

    const result = await getCursus('cursus-1');
    expect(result).toEqual(CURSUS_FULL);
  });

  it('propagates error thrown by $fetch to the caller', async () => {
    const fetchError = Object.assign(new Error('Not Found'), {
      data: { message: 'cursus.errors.notFound' },
    });
    mockFetch.mockRejectedValueOnce(fetchError);

    const { useCursus } = await import('~/composables/useCursus');
    const { getCursus } = useCursus();

    await expect(getCursus('missing-id')).rejects.toThrow();
  });
});

describe('useCursus — createCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /api/cursus with the correct body', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL, status: 'DRAFT' });
    const { useCursus } = await import('~/composables/useCursus');
    const { createCursus } = useCursus();

    await createCursus(CREATE_INPUT);

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus', {
      method: 'POST',
      body: CREATE_INPUT,
    });
  });

  it('tracks "cursus_created" analytics event with domain and level props', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL, status: 'DRAFT' });
    const { useCursus } = await import('~/composables/useCursus');
    const { createCursus } = useCursus();

    await createCursus(CREATE_INPUT);

    expect(mockTrack).toHaveBeenCalledWith('cursus_created', {
      domain: CREATE_INPUT.domain,
      level: CREATE_INPUT.level,
    });
  });

  it('does not track analytics event when $fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server error'));
    const { useCursus } = await import('~/composables/useCursus');
    const { createCursus } = useCursus();

    await createCursus(CREATE_INPUT).catch(() => undefined);

    expect(mockTrack).not.toHaveBeenCalledWith('cursus_created', expect.anything());
  });

  it('propagates $fetch error to the caller', async () => {
    const fetchError = Object.assign(new Error('Forbidden'), {
      data: { message: 'cursus.errors.forbidden' },
    });
    mockFetch.mockRejectedValueOnce(fetchError);

    const { useCursus } = await import('~/composables/useCursus');
    const { createCursus } = useCursus();

    await expect(createCursus(CREATE_INPUT)).rejects.toThrow();
  });

  it('returns the created cursus', async () => {
    const draftCursus = { ...CURSUS_FULL, status: 'DRAFT' };
    mockFetch.mockResolvedValueOnce(draftCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { createCursus } = useCursus();

    const result = await createCursus(CREATE_INPUT);
    expect(result).toEqual(draftCursus);
  });
});

describe('useCursus — deleteCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends DELETE to /api/cursus/:id', async () => {
    mockFetch.mockResolvedValueOnce({ success: true });
    const { useCursus } = await import('~/composables/useCursus');
    const { deleteCursus } = useCursus();

    await deleteCursus('cursus-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus/cursus-1', { method: 'DELETE' });
  });

  it('tracks "cursus_deleted" analytics event on success', async () => {
    mockFetch.mockResolvedValueOnce({ success: true });
    const { useCursus } = await import('~/composables/useCursus');
    const { deleteCursus } = useCursus();

    await deleteCursus('cursus-1');

    expect(mockTrack).toHaveBeenCalledWith('cursus_deleted');
  });

  it('does not track analytics when $fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Not found'));
    const { useCursus } = await import('~/composables/useCursus');
    const { deleteCursus } = useCursus();

    await deleteCursus('cursus-1').catch(() => undefined);

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('propagates $fetch error to the caller', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), { data: { message: 'cursus.errors.deleteBlockedByCohortes' } }),
    );
    const { useCursus } = await import('~/composables/useCursus');
    const { deleteCursus } = useCursus();

    await expect(deleteCursus('cursus-1')).rejects.toThrow();
  });
});

describe('useCursus — publishCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /api/cursus/:id/publish', async () => {
    const publishedCursus = { ...CURSUS_FULL, status: 'PUBLISHED' };
    mockFetch.mockResolvedValueOnce(publishedCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { publishCursus } = useCursus();

    await publishCursus('cursus-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus/cursus-1/publish', { method: 'POST' });
  });

  it('tracks "cursus_published" analytics event on success', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL, status: 'PUBLISHED' });
    const { useCursus } = await import('~/composables/useCursus');
    const { publishCursus } = useCursus();

    await publishCursus('cursus-1');

    expect(mockTrack).toHaveBeenCalledWith('cursus_published');
  });

  it('returns the published cursus', async () => {
    const publishedCursus = { ...CURSUS_FULL, status: 'PUBLISHED' };
    mockFetch.mockResolvedValueOnce(publishedCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { publishCursus } = useCursus();

    const result = await publishCursus('cursus-1');
    expect(result.status).toBe('PUBLISHED');
  });

  it('does not track analytics event when publish fails', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Unprocessable'), { data: { message: 'cursus.errors.noModulesForPublish' } }),
    );
    const { useCursus } = await import('~/composables/useCursus');
    const { publishCursus } = useCursus();

    await publishCursus('cursus-1').catch(() => undefined);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('propagates $fetch error to the caller', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Unprocessable Entity'));
    const { useCursus } = await import('~/composables/useCursus');
    const { publishCursus } = useCursus();

    await expect(publishCursus('cursus-1')).rejects.toThrow();
  });
});

describe('useCursus — archiveCursus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /api/cursus/:id/archive', async () => {
    const archivedCursus = { ...CURSUS_FULL, status: 'ARCHIVED' };
    mockFetch.mockResolvedValueOnce(archivedCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { archiveCursus } = useCursus();

    await archiveCursus('cursus-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus/cursus-1/archive', { method: 'POST' });
  });

  it('tracks "cursus_archived" analytics event on success', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL, status: 'ARCHIVED' });
    const { useCursus } = await import('~/composables/useCursus');
    const { archiveCursus } = useCursus();

    await archiveCursus('cursus-1');

    expect(mockTrack).toHaveBeenCalledWith('cursus_archived');
  });

  it('returns the archived cursus', async () => {
    const archivedCursus = { ...CURSUS_FULL, status: 'ARCHIVED' };
    mockFetch.mockResolvedValueOnce(archivedCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { archiveCursus } = useCursus();

    const result = await archiveCursus('cursus-1');
    expect(result.status).toBe('ARCHIVED');
  });

  it('does not track analytics event when archive fails', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Unprocessable'), { data: { message: 'cursus.errors.mustBePublishedToArchive' } }),
    );
    const { useCursus } = await import('~/composables/useCursus');
    const { archiveCursus } = useCursus();

    await archiveCursus('cursus-1').catch(() => undefined);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('propagates $fetch error to the caller', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Cannot archive'));
    const { useCursus } = await import('~/composables/useCursus');
    const { archiveCursus } = useCursus();

    await expect(archiveCursus('cursus-1')).rejects.toThrow();
  });
});

describe('useCursus — updateCursus()', () => {
  const UPDATE_INPUT = { title: 'Updated Title', durationWeeks: 16 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PATCH to /api/cursus/:id with the correct body', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL, title: 'Updated Title' });
    const { useCursus } = await import('~/composables/useCursus');
    const { updateCursus } = useCursus();

    await updateCursus('cursus-1', UPDATE_INPUT);

    expect(mockFetch).toHaveBeenCalledWith('/api/cursus/cursus-1', {
      method: 'PATCH',
      body: UPDATE_INPUT,
    });
  });

  it('returns the updated cursus', async () => {
    const updatedCursus = { ...CURSUS_FULL, title: 'Updated Title' };
    mockFetch.mockResolvedValueOnce(updatedCursus);
    const { useCursus } = await import('~/composables/useCursus');
    const { updateCursus } = useCursus();

    const result = await updateCursus('cursus-1', UPDATE_INPUT);
    expect(result.title).toBe('Updated Title');
  });

  it('sets error.value and rethrows when $fetch rejects', async () => {
    const fetchError = Object.assign(new Error('Forbidden'), {
      data: { message: 'cursus.errors.forbidden' },
    });
    mockFetch.mockRejectedValueOnce(fetchError);
    const { useCursus } = await import('~/composables/useCursus');
    const { updateCursus, error } = useCursus();

    await expect(updateCursus('cursus-1', UPDATE_INPUT)).rejects.toThrow();
    expect(error.value).toBe('cursus.errors.forbidden');
  });

  it('resets loading to false after success', async () => {
    mockFetch.mockResolvedValueOnce({ ...CURSUS_FULL });
    const { useCursus } = await import('~/composables/useCursus');
    const { updateCursus, loading } = useCursus();

    await updateCursus('cursus-1', UPDATE_INPUT);
    expect(loading.value).toBe(false);
  });

  it('resets loading to false even after an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    const { useCursus } = await import('~/composables/useCursus');
    const { updateCursus, loading } = useCursus();

    await updateCursus('cursus-1', UPDATE_INPUT).catch(() => undefined);
    expect(loading.value).toBe(false);
  });
});

describe('useCursus — loading state and error isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial loading is false', async () => {
    const { useCursus } = await import('~/composables/useCursus');
    const { loading } = useCursus();
    expect(loading.value).toBe(false);
  });

  it('initial error is null', async () => {
    const { useCursus } = await import('~/composables/useCursus');
    const { error } = useCursus();
    expect(error.value).toBeNull();
  });

  it('each useCursus() call returns independent reactive state', async () => {
    const { useCursus } = await import('~/composables/useCursus');
    const instance1 = useCursus();
    const instance2 = useCursus();

    // Instances should be independent (different ref objects)
    expect(instance1.loading).not.toBe(instance2.loading);
    expect(instance1.error).not.toBe(instance2.error);
  });
});
