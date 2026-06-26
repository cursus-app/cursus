// @vitest-environment happy-dom
/**
 * Tests unitaires pour useNotifications (ST-12.1).
 *
 * Stratégie : vi.stubGlobal($fetch) au niveau module (même pattern que useCohorte.spec.ts).
 * Chaque test crée une nouvelle instance du composable via buildComposable().
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// ---- Données de test ----

// Créer de nouvelles copies à chaque fois pour éviter les mutations.
function makeNotifUnread() {
  return {
    id: 'n1',
    type: 'BADGE_AWARDED' as const,
    title: 'Badge obtenu !',
    body: null,
    readAt: null as string | null,
    createdAt: '2026-06-27T10:00:00Z',
  };
}

function makeNotifRead() {
  return {
    id: 'n2',
    type: 'SUBMISSION_VALIDATED' as const,
    title: 'Livrable validé',
    body: 'Module 1 validé.',
    readAt: '2026-06-27T09:00:00Z',
    createdAt: '2026-06-27T08:00:00Z',
  };
}

function makeDefaultResponse() {
  return {
    data: [makeNotifUnread(), makeNotifRead()],
    meta: {
      total: 2,
      unreadCount: 1,
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
  const { useNotifications } = await import('~/composables/useNotifications');
  return useNotifications();
}

// ---- Tests ----

describe('useNotifications — fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('peuple notifications et unreadCount après fetch', async () => {
    const defaultResponse = makeDefaultResponse();
    mockFetch.mockResolvedValueOnce(defaultResponse);

    const { fetch, notifications, unreadCount } = await buildComposable();
    await fetch();

    expect(notifications.value).toHaveLength(2);
    expect(notifications.value[0]?.id).toBe('n1');
    expect(unreadCount.value).toBe(1);
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

  it("capture l'erreur si $fetch rejette", async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { fetch, error } = await buildComposable();
    await fetch();

    expect(error.value).toBe('Network error');
  });

  it('appelle /api/notifications avec unreadOnly=true si demandé', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());

    const { fetch } = await buildComposable();
    await fetch(true);

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications', {
      query: { unreadOnly: 'true' },
    });
  });
});

describe('useNotifications — markRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('marque optimistement la notif et décrémente unreadCount', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch initial
    mockFetch.mockResolvedValueOnce({ id: 'n1', readAt: new Date().toISOString() }); // mark-read

    const { fetch, markRead, unreadCount } = await buildComposable();
    await fetch();
    expect(unreadCount.value).toBe(1);

    await markRead('n1');
    expect(unreadCount.value).toBe(0);
  });

  it('ne marque pas une notif déjà lue (idempotent)', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch initial

    const { fetch, markRead } = await buildComposable();
    await fetch();

    // NOTIF_READ est déjà lue → ne doit pas appeler l'API mark-read
    mockFetch.mockClear();
    await markRead('n2');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rollback optimiste si API rejette', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse()); // fetch initial
    mockFetch.mockRejectedValueOnce(new Error('API error')); // mark-read fail

    const { fetch, markRead, unreadCount } = await buildComposable();
    await fetch();
    expect(unreadCount.value).toBe(1);

    await markRead('n1');
    // Après rollback, unreadCount revient à 1
    expect(unreadCount.value).toBe(1);
  });
});

describe('useNotifications — markAllRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('passe unreadCount à 0 de façon optimiste', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());
    mockFetch.mockResolvedValueOnce({ markedRead: 1 });

    const { fetch, markAllRead, unreadCount } = await buildComposable();
    await fetch();
    expect(unreadCount.value).toBe(1);

    await markAllRead();
    expect(unreadCount.value).toBe(0);
  });

  it('rollback si API rejette', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    const { fetch, markAllRead, unreadCount } = await buildComposable();
    await fetch();
    const prevUnread = unreadCount.value; // 1

    await markAllRead();
    // rollback : unreadCount revient à 1
    expect(unreadCount.value).toBe(prevUnread);
  });
});

describe('useNotifications — remove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('supprime la notif de la liste de façon optimiste', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());
    mockFetch.mockResolvedValueOnce({ deleted: true });

    const { fetch, remove, notifications } = await buildComposable();
    await fetch();
    expect(notifications.value).toHaveLength(2);

    await remove('n1');
    expect(notifications.value.find((n) => n.id === 'n1')).toBeUndefined();
  });

  it('rollback si API rejette', async () => {
    mockFetch.mockResolvedValueOnce(makeDefaultResponse());
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    const { fetch, remove, notifications } = await buildComposable();
    await fetch();
    await remove('n1');
    // rollback : n1 revient
    expect(notifications.value.some((n) => n.id === 'n1')).toBe(true);
  });
});

describe('useNotifications — polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('startPolling déclenche fetch toutes les X ms', async () => {
    mockFetch.mockResolvedValue(makeDefaultResponse());

    const { startPolling, stopPolling } = await buildComposable();
    startPolling(1000);

    await vi.advanceTimersByTimeAsync(3100);
    // 3 déclenchements (à 1s, 2s, 3s)
    expect(mockFetch).toHaveBeenCalledTimes(3);

    stopPolling();
  });

  it('stopPolling arrête le polling', async () => {
    mockFetch.mockResolvedValue(makeDefaultResponse());

    const { startPolling, stopPolling } = await buildComposable();
    startPolling(1000);
    await vi.advanceTimersByTimeAsync(1500);
    stopPolling();
    await vi.advanceTimersByTimeAsync(3000);

    // Seulement 1 déclenchement avant stopPolling
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
