// @vitest-environment happy-dom
/**
 * Tests unitaires pour useStagiaireTimeline (ST-13.3).
 * Stratégie : vi.stubGlobal($fetch) pour mocker les appels API.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { TimelineResponse } from '~~/shared/types/timeline';

// ─── Mock $fetch ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ─── Helper ──────────────────────────────────────────────────────────────────

async function buildComposable(stagiaireId = 'stagiaire-1', cohorteId = 'cohorte-1') {
  const { useStagiaireTimeline } = await import('~/composables/useStagiaireTimeline');
  return useStagiaireTimeline(ref(stagiaireId), ref(cohorteId));
}

function makeSubmissionEvent(id: string, timestamp: string) {
  return {
    id,
    type: 'submission' as const,
    timestamp,
    data: {
      moduleId: 'mod-1',
      moduleName: 'HTML/CSS',
      status: 'VALIDATED',
      repoUrl: 'https://github.com/test',
      overriddenById: null,
      overrideReason: null,
    },
  };
}

function makeResponse(
  events: ReturnType<typeof makeSubmissionEvent>[],
  nextCursor: string | null = null,
): TimelineResponse {
  return { events, nextCursor };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useStagiaireTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('$fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it("fetchPage peuple events depuis l'API", async () => {
    const event = makeSubmissionEvent('e1', '2026-06-01T10:00:00Z');
    mockFetch.mockResolvedValueOnce(makeResponse([event]));
    const { fetchPage, events, nextCursor } = await buildComposable();

    await fetchPage();

    expect(events.value).toHaveLength(1);
    expect(events.value[0]?.id).toBe('e1');
    expect(nextCursor.value).toBeNull();
  });

  it('fetchPage met loading à true pendant le fetch', async () => {
    let resolvePromise!: (v: TimelineResponse) => void;
    const pending = new Promise<TimelineResponse>((res) => {
      resolvePromise = res;
    });
    mockFetch.mockReturnValueOnce(pending);
    const { fetchPage, loading } = await buildComposable();

    const fetchTask = fetchPage();
    expect(loading.value).toBe(true);

    resolvePromise(makeResponse([]));
    await fetchTask;
    expect(loading.value).toBe(false);
  });

  it('fetchPage avec cursor appends les événements (loadMore)', async () => {
    const event1 = makeSubmissionEvent('e1', '2026-06-02T10:00:00Z');
    const event2 = makeSubmissionEvent('e2', '2026-06-01T10:00:00Z');
    mockFetch
      .mockResolvedValueOnce(makeResponse([event1], '2026-06-02T10:00:00Z'))
      .mockResolvedValueOnce(makeResponse([event2]));
    const { fetchPage, events, nextCursor } = await buildComposable();

    await fetchPage();
    expect(events.value).toHaveLength(1);
    expect(nextCursor.value).toBe('2026-06-02T10:00:00Z');

    // loadMore via cursor
    await fetchPage(nextCursor.value ?? undefined);
    expect(events.value).toHaveLength(2);
    expect(events.value[0]?.id).toBe('e1');
    expect(events.value[1]?.id).toBe('e2');
  });

  it('loadMore ne fait rien si nextCursor est null', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));
    const { fetchPage, loadMore } = await buildComposable();

    await fetchPage();
    await loadMore();

    expect(mockFetch).toHaveBeenCalledTimes(1); // pas de 2ème appel
  });

  it('loadMore ne fait rien si loading est true', async () => {
    let resolvePromise!: (v: TimelineResponse) => void;
    const pending = new Promise<TimelineResponse>((res) => {
      resolvePromise = res;
    });
    mockFetch.mockReturnValueOnce(pending);
    const { fetchPage, loadMore } = await buildComposable();

    const fetchTask = fetchPage();
    await loadMore(); // doit être ignoré car loading=true

    resolvePromise(makeResponse([], '2026-06-01T10:00:00Z'));
    await fetchTask;

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetchPage ne fait rien si stagiaireId est vide', async () => {
    const { fetchPage, events } = await buildComposable('', 'cohorte-1');
    await fetchPage();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(events.value).toHaveLength(0);
  });

  it('error est défini si $fetch throw', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { fetchPage, error } = await buildComposable();

    await fetchPage();

    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe('Network error');
  });

  it('resetFilters réinitialise activeFilters et recharge depuis le début', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));
    const { fetchPage, resetFilters, activeFilters } = await buildComposable();

    await fetchPage();
    activeFilters.value = ['submission', 'alert'];
    resetFilters();

    expect(activeFilters.value).toHaveLength(0);
  });

  it("nextCursor est mis à jour avec la valeur de l'API", async () => {
    const cursor = '2026-06-01T10:00:00Z';
    mockFetch.mockResolvedValueOnce(makeResponse([], cursor));
    const { fetchPage, nextCursor } = await buildComposable();

    await fetchPage();

    expect(nextCursor.value).toBe(cursor);
  });
});
