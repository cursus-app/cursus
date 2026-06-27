// @vitest-environment happy-dom
/**
 * Tests unitaires pour useCurrentWeek (ST-05.1).
 *
 * Stratégie : vi.stubGlobal($fetch) — même pattern que useNotifications.spec.ts.
 * Chaque test crée une instance fraîche du composable via buildComposable().
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import type { CurrentWeekResponse } from '~/composables/useCurrentWeek';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeModule(overrides: Partial<CurrentWeekResponse['currentModule']> = {}): NonNullable<CurrentWeekResponse['currentModule']> {
  const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  return {
    cohortModuleId: 'cm-1',
    moduleId: 'mod-1',
    week: 3,
    title: 'Introduction à Git',
    objectives: 'Maîtriser les bases de Git',
    resources: [
      { url: 'https://example.com/git', title: 'Git Tutorial', type: 'article' },
    ],
    deliverable: {
      description: 'Créer un dépôt GitHub avec 5 commits signés.',
      repoRequired: true,
      deployRequired: false,
    },
    hasQuiz: false,
    quizId: null,
    quizTitle: null,
    xpReward: 100,
    dueDate: tomorrow,
    daysLeft: 2,
    isLate: false,
    ...overrides,
  };
}

function makeLateModule(): NonNullable<CurrentWeekResponse['currentModule']> {
  const yesterday = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  return makeModule({
    dueDate: yesterday,
    daysLeft: -3,
    isLate: true,
  });
}

function makeProgression(
  status: string = 'EN_COURS',
): NonNullable<CurrentWeekResponse['progression']> {
  return {
    status: status as NonNullable<CurrentWeekResponse['progression']>['status'],
    submittedAt: null,
    validatedAt: null,
  };
}

function makeTimelineModule(
  week: number,
  status: string = 'A_VENIR',
): CurrentWeekResponse['allModules'][number] {
  return {
    cohortModuleId: `cm-${week}`,
    moduleId: `mod-${week}`,
    week,
    title: `Module ${week}`,
    position: week,
    dueDate: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysLeft: week * 7,
    isLate: false,
    status: status as CurrentWeekResponse['allModules'][number]['status'],
    submittedAt: null,
    validatedAt: null,
    hasQuiz: false,
  };
}

function makeResponse(overrides: Partial<CurrentWeekResponse> = {}): CurrentWeekResponse {
  return {
    cohort: {
      id: 'cohorte-1',
      name: 'Promo Été 2026',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    },
    currentModule: makeModule(),
    progression: makeProgression(),
    totalModules: 10,
    allModules: [
      makeTimelineModule(1, 'VALIDE'),
      makeTimelineModule(2, 'VALIDE'),
      makeTimelineModule(3, 'EN_COURS'),
      makeTimelineModule(4, 'A_VENIR'),
    ],
    ...overrides,
  };
}

// ─── Mock $fetch ──────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ─── Helper ───────────────────────────────────────────────────────────────────

async function buildComposable() {
  const { useCurrentWeek } = await import('~/composables/useCurrentWeek');
  return useCurrentWeek();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCurrentWeek — fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('retourne les données correctes après refresh()', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse());

    const { module, progression, cohort, allModules, totalModules, refresh } =
      await buildComposable();
    await refresh();

    expect(module.value?.title).toBe('Introduction à Git');
    expect(module.value?.week).toBe(3);
    expect(progression.value?.status).toBe('EN_COURS');
    expect(cohort.value?.name).toBe('Promo Été 2026');
    expect(allModules.value).toHaveLength(4);
    expect(totalModules.value).toBe(10);
  });

  it('positionne isLoading pendant le chargement puis false après', async () => {
    let resolveFetch!: (value: CurrentWeekResponse) => void;
    mockFetch.mockReturnValueOnce(
      new Promise<CurrentWeekResponse>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { refresh, isLoading } = await buildComposable();
    const fetchPromise = refresh();
    expect(isLoading.value).toBe(true);
    resolveFetch(makeResponse());
    await fetchPromise;
    expect(isLoading.value).toBe(false);
  });

  it("capture l'erreur si $fetch rejette", async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { refresh, error } = await buildComposable();
    await refresh();

    expect(error.value).toBe('Network error');
  });

  it('appelle /api/me/current-week', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse());

    const { refresh } = await buildComposable();
    await refresh();

    expect(mockFetch).toHaveBeenCalledWith('/api/me/current-week');
  });
});

describe('useCurrentWeek — isLate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('isLate = false quand daysLeft > 0', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        currentModule: makeModule({ daysLeft: 2, isLate: false }),
        progression: makeProgression('EN_COURS'),
      }),
    );

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(false);
  });

  it('isLate = true quand daysLeft < 0 et status EN_COURS (pas encore soumis)', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        currentModule: makeLateModule(),
        progression: makeProgression('EN_COURS'),
      }),
    );

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(true);
  });

  it('isLate = false quand daysLeft < 0 mais status SOUMIS', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        currentModule: makeLateModule(),
        progression: makeProgression('SOUMIS'),
      }),
    );

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(false);
  });

  it('isLate = false quand daysLeft < 0 mais status VALIDE', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        currentModule: makeLateModule(),
        progression: makeProgression('VALIDE'),
      }),
    );

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(false);
  });

  it('isLate = false quand daysLeft < 0 mais status VALIDE_OVERRIDE', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({
        currentModule: makeLateModule(),
        progression: makeProgression('VALIDE_OVERRIDE'),
      }),
    );

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(false);
  });
});

describe('useCurrentWeek — hasSubmitted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('hasSubmitted = false quand status EN_COURS', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ progression: makeProgression('EN_COURS') }),
    );

    const { refresh, hasSubmitted } = await buildComposable();
    await refresh();

    expect(hasSubmitted.value).toBe(false);
  });

  it('hasSubmitted = true quand status SOUMIS', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ progression: makeProgression('SOUMIS') }),
    );

    const { refresh, hasSubmitted } = await buildComposable();
    await refresh();

    expect(hasSubmitted.value).toBe(true);
  });

  it('hasSubmitted = true quand status VALIDE', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ progression: makeProgression('VALIDE') }),
    );

    const { refresh, hasSubmitted } = await buildComposable();
    await refresh();

    expect(hasSubmitted.value).toBe(true);
  });

  it('hasSubmitted = true quand status VALIDE_OVERRIDE', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ progression: makeProgression('VALIDE_OVERRIDE') }),
    );

    const { refresh, hasSubmitted } = await buildComposable();
    await refresh();

    expect(hasSubmitted.value).toBe(true);
  });
});

describe('useCurrentWeek — états vides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('retourne null pour module/cohort si pas de cohorte active', async () => {
    mockFetch.mockResolvedValueOnce({
      cohort: null,
      currentModule: null,
      progression: null,
      allModules: [],
    } satisfies CurrentWeekResponse);

    const { refresh, module, cohort, progression } = await buildComposable();
    await refresh();

    expect(module.value).toBeNull();
    expect(cohort.value).toBeNull();
    expect(progression.value).toBeNull();
  });

  it('isLate = false si module null', async () => {
    mockFetch.mockResolvedValueOnce({
      cohort: null,
      currentModule: null,
      progression: null,
      allModules: [],
    } satisfies CurrentWeekResponse);

    const { refresh, isLate } = await buildComposable();
    await refresh();

    expect(isLate.value).toBe(false);
  });

  it('hasSubmitted = false si progression null', async () => {
    mockFetch.mockResolvedValueOnce({
      cohort: null,
      currentModule: null,
      progression: null,
      allModules: [],
    } satisfies CurrentWeekResponse);

    const { refresh, hasSubmitted } = await buildComposable();
    await refresh();

    expect(hasSubmitted.value).toBe(false);
  });
});
