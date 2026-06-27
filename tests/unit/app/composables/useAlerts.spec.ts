// @vitest-environment happy-dom
/**
 * Tests unitaires pour useAlerts (ST-08.3).
 *
 * Stratégie : vi.stubGlobal($fetch) au niveau module (même pattern que useNotifications.spec.ts).
 * Chaque test crée une nouvelle instance du composable via buildComposable().
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// ---- Données de test ----

function makeAlertOpen() {
  return {
    id: 'a1',
    kind: 'RETARD' as const,
    severity: 'WARNING' as const,
    context: null,
    createdAt: '2026-06-27T10:00:00Z',
    resolvedAt: null as string | null,
    resolvedById: null as string | null,
    sourceType: null,
    sourceId: null,
    user: {
      id: 'u1',
      fullName: 'Alice Dupont',
      email: 'alice@example.com',
      avatarUrl: null,
    },
    resolvedBy: null,
  };
}

function makeAlertResolved() {
  return {
    id: 'a2',
    kind: 'INACTIVITY' as const,
    severity: 'CRITICAL' as const,
    context: { days: 5 },
    createdAt: '2026-06-26T08:00:00Z',
    resolvedAt: '2026-06-27T09:00:00Z',
    resolvedById: 'f1',
    sourceType: null,
    sourceId: null,
    user: {
      id: 'u2',
      fullName: 'Bob Martin',
      email: 'bob@example.com',
      avatarUrl: null,
    },
    resolvedBy: { id: 'f1', fullName: 'Formateur' },
  };
}

function makeDefaultResponse() {
  return {
    data: [makeAlertOpen()],
    meta: {
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
    },
  };
}

// ---- Mock $fetch au niveau module ----

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ---- Helper : crée une instance fraîche du composable ----

async function buildComposable() {
  const { useAlerts } = await import('~/composables/useAlerts');
  return useAlerts();
}

// ---- Tests : fetch ----

describe('useAlerts — fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('peuple alerts et meta après fetch', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());

    const { fetch, alerts, meta } = await buildComposable();
    await fetch();

    expect(alerts.value).toHaveLength(1);
    expect(alerts.value[0]?.id).toBe('a1');
    expect(meta.value.total).toBe(1);
  });

  it('positionne isLoading à true pendant le fetch puis false après', async () => {
    const defaultResponse = makeDefaultResponse();
    let resolveFetch!: (value: typeof defaultResponse) => void;
    mockFetch.mockReturnValueOnce(
      new Promise<typeof defaultResponse>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { fetch, isLoading } = await buildComposable();
    const fetchPromise = fetch();
    expect(isLoading.value).toBe(true);
    resolveFetch(defaultResponse);
    await fetchPromise;
    expect(isLoading.value).toBe(false);
  });

  it("capture l'erreur si $fetch rejette avec Error", async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { fetch, error } = await buildComposable();
    await fetch();

    expect(error.value).toBe('Network error');
  });

  it('capture un message générique si $fetch rejette sans Error', async () => {
    mockFetch.mockRejectedValueOnce('some string error');

    const { fetch, error } = await buildComposable();
    await fetch();

    expect(error.value).toBe('Erreur de chargement des alertes');
  });

  it('inclut search dans la query si filters.search est non vide', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());

    const { fetch, setFilter } = await buildComposable();
    setFilter('search', 'alice');
    await fetch();

    expect(mockFetch).toHaveBeenCalledWith('/api/me/alerts', {
      query: expect.objectContaining({ search: 'alice' }),
    });
  });

  it("n'inclut pas search dans la query si filters.search est vide", async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());

    const { fetch } = await buildComposable();
    await fetch();

    const callQuery = mockFetch.mock.calls[0]?.[1]?.query;
    expect(callQuery).not.toHaveProperty('search');
  });
});

// ---- Tests : resolve ----

describe('useAlerts — resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it("retire l'alerte de la liste (optimistic) quand status=open", async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch
    mockFetch.mockResolvedValueOnce({ id: 'a1', resolvedAt: new Date().toISOString() }); // resolve

    const { fetch, resolve, alerts, meta } = await buildComposable();
    await fetch();
    expect(alerts.value).toHaveLength(1);

    await resolve('a1');
    expect(alerts.value.find((a) => a.id === 'a1')).toBeUndefined();
    expect(meta.value.total).toBe(0);
  });

  it("ne fait rien si l'alerte est déjà résolue", async () => {
    const response = {
      data: [makeAlertResolved()],
      meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce(response); // fetch

    const { fetch, resolve } = await buildComposable();
    await fetch();

    mockFetch.mockClear();
    await resolve('a2');
    // Pas d'appel API car déjà résolu
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'id d'alerte est introuvable", async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch

    const { fetch, resolve, alerts } = await buildComposable();
    await fetch();

    mockFetch.mockClear();
    await resolve('inexistant');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(alerts.value).toHaveLength(1); // unchanged
  });

  it('rollback via fetch si API rejette et status=open', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch initial
    mockFetch.mockRejectedValueOnce(new Error('API error')); // resolve fail
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // refetch (rollback)

    const { fetch, resolve, alerts } = await buildComposable();
    await fetch();

    await resolve('a1');

    // Le refetch a été appelé (total calls: fetch + reject + refetch)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Après le rollback fetch, alerts reviennent
    expect(alerts.value).toHaveLength(1);
  });

  it('rollback direct si API rejette et status=resolved', async () => {
    const openAlert = makeAlertOpen();
    const resolvedAlert = makeAlertResolved();
    const response = {
      data: [openAlert, resolvedAlert],
      meta: { total: 2, page: 1, perPage: 20, totalPages: 1 },
    };
    mockFetch.mockResolvedValueOnce(response); // fetch initial

    const { fetch, resolve, setFilter, alerts } = await buildComposable();
    // Passer le filtre en "resolved" pour avoir les deux alertes
    setFilter('status', 'resolved');
    await fetch();

    mockFetch.mockRejectedValueOnce(new Error('fail')); // resolve fail

    // Résoudre l'alerte ouverte (qui n'est pas encore résolue)
    await resolve('a1');

    // Le rollback direct remet l'alerte à son état précédent
    const restoredAlert = alerts.value.find((a) => a.id === 'a1');
    expect(restoredAlert?.resolvedAt).toBeNull();
  });
});

// ---- Tests : setFilter et setPage ----

describe('useAlerts — setFilter / setPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('setFilter met à jour le filtre et réinitialise la page à 1', async () => {
    const { filters, setFilter, setPage } = await buildComposable();
    setPage(3);
    expect(filters.page).toBe(3);

    setFilter('kind', 'RETARD');
    expect(filters.kind).toBe('RETARD');
    expect(filters.page).toBe(1); // réinitialisé
  });

  it('setPage navigue à la page demandée', async () => {
    const { filters, setPage } = await buildComposable();
    setPage(5);
    expect(filters.page).toBe(5);
  });

  it('setFilter sur status change le filtre', async () => {
    const { filters, setFilter } = await buildComposable();
    expect(filters.status).toBe('open');
    setFilter('status', 'resolved');
    expect(filters.status).toBe('resolved');
  });
});
