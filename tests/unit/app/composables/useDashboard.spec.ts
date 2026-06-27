// @vitest-environment happy-dom
/**
 * Tests unitaires pour useDashboard (ST-13.1).
 *
 * Stratégie : vi.stubGlobal($fetch) — même pattern que useNotifications,
 * useMySubmissions, etc.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { DashboardData } from '~/composables/useDashboard';

// ---- Mock $fetch ----

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ---- Helpers ----

function makeCurrentWeek(
  overrides: Partial<DashboardData['currentWeek']> = {},
): DashboardData['currentWeek'] {
  return {
    moduleId: null,
    moduleTitle: null,
    dueDate: null,
    status: null,
    hasSubmitted: false,
    cohortModuleId: null,
    ...overrides,
  };
}

function makeDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    currentWeek: makeCurrentWeek({ moduleId: 'mod-1', moduleTitle: 'Introduction à Git' }),
    progress: {
      completedModules: 3,
      totalModules: 10,
      progressPct: 30,
      xpTotal: 150,
    },
    badges: { total: 2, last3: [] },
    feed: [],
    upcomingDeadlines: [],
    ...overrides,
  };
}

// ---- Helper : crée une instance fraîche du composable ----

async function buildComposable() {
  const { useDashboard } = await import('~/composables/useDashboard');
  return useDashboard();
}

// ---- Tests ----

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('initialise avec des valeurs par défaut', async () => {
    const { data, isLoading, error } = await buildComposable();
    expect(data.value).toBeNull();
    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('charge les données via fetch()', async () => {
    const dashData = makeDashboardData();
    mockFetch.mockResolvedValueOnce(dashData);

    const { fetch, data, isLoading, error } = await buildComposable();
    await fetch();

    expect(data.value).toEqual(dashData);
    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/me/dashboard');
  });

  it('met isLoading à true pendant le chargement', async () => {
    let resolvePromise!: (value: DashboardData) => void;
    mockFetch.mockReturnValueOnce(
      new Promise<DashboardData>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { fetch, isLoading } = await buildComposable();
    const fetchPromise = fetch();

    expect(isLoading.value).toBe(true);
    resolvePromise(makeDashboardData());
    await fetchPromise;
    expect(isLoading.value).toBe(false);
  });

  it("capture l'erreur si $fetch échoue", async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { fetch, error, data } = await buildComposable();
    await fetch();

    expect(error.value).toBe('Network error');
    expect(data.value).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/me/dashboard');
  });

  describe('hasCurrentWeek', () => {
    it('est true quand currentWeek.moduleId est défini après fetch', async () => {
      mockFetch.mockResolvedValueOnce(
        makeDashboardData({ currentWeek: makeCurrentWeek({ moduleId: 'mod-1' }) }),
      );

      const { fetch, hasCurrentWeek } = await buildComposable();
      expect(hasCurrentWeek.value).toBe(false); // avant fetch
      await fetch();
      expect(hasCurrentWeek.value).toBe(true);
    });

    it('est false quand currentWeek.moduleId est null', async () => {
      mockFetch.mockResolvedValueOnce(
        makeDashboardData({ currentWeek: makeCurrentWeek({ moduleId: null }) }),
      );

      const { fetch, hasCurrentWeek } = await buildComposable();
      await fetch();
      expect(hasCurrentWeek.value).toBe(false);
    });

    it('est false quand data est null (avant fetch)', async () => {
      const { hasCurrentWeek } = await buildComposable();
      expect(hasCurrentWeek.value).toBe(false);
    });
  });

  describe('hasNoCohort', () => {
    it('est true après fetch si sans moduleId ni totalModules', async () => {
      mockFetch.mockResolvedValueOnce(
        makeDashboardData({
          currentWeek: makeCurrentWeek({ moduleId: null }),
          progress: { completedModules: 0, totalModules: 0, progressPct: 0, xpTotal: 0 },
        }),
      );

      const { fetch, hasNoCohort } = await buildComposable();
      expect(hasNoCohort.value).toBe(false); // pas encore chargé
      await fetch();
      expect(hasNoCohort.value).toBe(true);
    });

    it('est false si moduleId est défini', async () => {
      mockFetch.mockResolvedValueOnce(makeDashboardData());

      const { fetch, hasNoCohort } = await buildComposable();
      await fetch();
      expect(hasNoCohort.value).toBe(false);
    });

    it('est false si totalModules > 0 même sans moduleId courant', async () => {
      mockFetch.mockResolvedValueOnce(
        makeDashboardData({
          currentWeek: makeCurrentWeek({ moduleId: null }),
          progress: { completedModules: 0, totalModules: 5, progressPct: 0, xpTotal: 0 },
        }),
      );

      const { fetch, hasNoCohort } = await buildComposable();
      await fetch();
      expect(hasNoCohort.value).toBe(false);
    });

    it('est false pendant le chargement', async () => {
      let resolve!: (v: DashboardData) => void;
      mockFetch.mockReturnValueOnce(
        new Promise<DashboardData>((r) => {
          resolve = r;
        }),
      );

      const { fetch, hasNoCohort } = await buildComposable();
      const fetchPromise = fetch();
      expect(hasNoCohort.value).toBe(false);
      resolve(
        makeDashboardData({
          currentWeek: makeCurrentWeek({ moduleId: null }),
          progress: { completedModules: 0, totalModules: 0, progressPct: 0, xpTotal: 0 },
        }),
      );
      await fetchPromise;
      expect(hasNoCohort.value).toBe(true);
    });

    it('est false si fetch échoue (erreur réseau)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));

      const { fetch, hasNoCohort } = await buildComposable();
      await fetch();
      expect(hasNoCohort.value).toBe(false);
    });
  });
});
