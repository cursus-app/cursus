// @vitest-environment happy-dom
/**
 * Tests unitaires pour useHarnessRunRealtime (ST-06.4).
 *
 * Stratégie :
 *  - Mocker useSupabaseClient via mockNuxtImport
 *  - Mocker useI18n et useAppToast via mockNuxtImport
 *  - Mocker $fetch globalement pour le fallback polling
 *  - Capturer les callbacks Realtime pour les appeler manuellement
 *
 * Note : MAX_WS_RETRIES=3 signifie 3 tentatives de reconnexion → la 4e erreur
 * déclenche le fallback polling.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { nextTick, ref, defineComponent } from 'vue';
import { mount } from '@vue/test-utils';

// ─── Types internes ──────────────────────────────────────────────────────────

type RealtimeCallback = (payload: {
  new: { id: string; status: string; checks_json: unknown };
}) => void;
type SubscribeCallback = (status: string) => void;

// ─── Mock Supabase Realtime ───────────────────────────────────────────────────

let capturedOnCallback: RealtimeCallback | null = null;
let capturedSubscribeCallback: SubscribeCallback | null = null;
const mockRemoveChannel = vi.fn();

function createMockChannel() {
  const channel = {
    on: vi.fn((_event: string, _filter: unknown, cb: RealtimeCallback) => {
      capturedOnCallback = cb;
      return channel;
    }),
    subscribe: vi.fn((cb: SubscribeCallback) => {
      capturedSubscribeCallback = cb;
      return channel;
    }),
  };
  return channel;
}

let mockChannel = createMockChannel();

const mockSupabaseClient = {
  channel: vi.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};

mockNuxtImport('useSupabaseClient', () => () => mockSupabaseClient);

// ─── Mock i18n ────────────────────────────────────────────────────────────────

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key, // retourne la clé telle quelle
}));

// ─── Mock useAppToast ─────────────────────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastDanger = vi.fn();

mockNuxtImport('useAppToast', () => () => ({
  success: mockToastSuccess,
  danger: mockToastDanger,
}));

// ─── Mock $fetch global ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildComposable(runId: string | null = null) {
  const { useHarnessRunRealtime } = await import('~/composables/useHarnessRunRealtime');
  const runIdRef = ref<string | null>(runId);
  const result = useHarnessRunRealtime(runIdRef);
  return { ...result, runIdRef };
}

// Helper : trigger N CHANNEL_ERRORs avec les reconnects associés
// (chaque erreur déclenche un reconnect via setTimeout, le prochain capturedSubscribeCallback
// est mis à jour lors de la reconnexion).
async function triggerWsErrors(count: number) {
  const delays = [1000, 2000, 4000, 8000, 16000, 30000];
  for (let i = 0; i < count; i++) {
    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();
    const delay = (delays[i] ?? 30000) + 100;
    await vi.advanceTimersByTimeAsync(delay);
    await nextTick();
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useHarnessRunRealtime — initialisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnCallback = null;
    capturedSubscribeCallback = null;
    mockChannel = createMockChannel();
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'QUEUED', checksJson: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('subscribe est appelé dès que runId est défini', async () => {
    await buildComposable('run-abc');
    await nextTick();
    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('harness-run-run-abc');
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('status et checksJson sont null au démarrage', async () => {
    const { status, checksJson } = await buildComposable('run-abc');
    expect(status.value).toBeNull();
    expect(checksJson.value).toBeNull();
  });

  it('isConnected est false avant SUBSCRIBED', async () => {
    const { isConnected } = await buildComposable('run-abc');
    expect(isConnected.value).toBe(false);
  });

  it('aucune subscription si runId est null', async () => {
    await buildComposable(null);
    await nextTick();
    expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
  });
});

describe('useHarnessRunRealtime — événements Realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnCallback = null;
    capturedSubscribeCallback = null;
    mockChannel = createMockChannel();
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    // Par défaut fetch retourne QUEUED (status neutre, non terminal)
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'QUEUED', checksJson: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('met à jour status quand un événement postgres_changes est reçu', async () => {
    const { status } = await buildComposable('run-abc');
    await nextTick();

    // Déclencher le callback directement (sans SUBSCRIBED, pour éviter interference du catch-up poll)
    capturedOnCallback?.({
      new: { id: 'run-abc', status: 'RUNNING', checks_json: null },
    });
    await nextTick();

    expect(status.value).toBe('RUNNING');
  });

  it('met à jour checksJson quand un événement contient des checks', async () => {
    const checks = { linter: true, tests: false };
    const { checksJson } = await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'SUCCESS', checks_json: checks } });
    await nextTick();

    expect(checksJson.value).toEqual(checks);
  });

  it('passe isConnected à true après SUBSCRIBED', async () => {
    const { isConnected } = await buildComposable('run-abc');
    await nextTick();

    capturedSubscribeCallback?.('SUBSCRIBED');
    await nextTick();

    expect(isConnected.value).toBe(true);
  });

  it('affiche un toast success sur transition vers SUCCESS', async () => {
    const { status } = await buildComposable('run-abc');
    await nextTick();

    // Déclencher directement le callback realtime (la transition est testée indépendamment du catch-up poll)
    capturedOnCallback?.({ new: { id: 'run-abc', status: 'SUCCESS', checks_json: null } });
    await nextTick();

    expect(status.value).toBe('SUCCESS');
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'realtime.toast.success',
      'realtime.toast.successDescription',
    );
  });

  it('affiche un toast danger sur transition vers FAILURE', async () => {
    const { status } = await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'FAILURE', checks_json: null } });
    await nextTick();

    expect(status.value).toBe('FAILURE');
    expect(mockToastDanger).toHaveBeenCalledWith(
      'realtime.toast.failure',
      'realtime.toast.failureDescription',
    );
  });

  it('affiche un toast danger sur transition vers TIMEOUT', async () => {
    await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'TIMEOUT', checks_json: null } });
    await nextTick();

    expect(mockToastDanger).toHaveBeenCalled();
  });

  it('ne montre pas 2 toasts pour le même run (idempotent)', async () => {
    await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'SUCCESS', checks_json: null } });
    await nextTick();
    capturedOnCallback?.({ new: { id: 'run-abc', status: 'SUCCESS', checks_json: null } });
    await nextTick();

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it('ne montre pas de toast si status ne change pas vers terminal', async () => {
    await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'RUNNING', checks_json: null } });
    await nextTick();

    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastDanger).not.toHaveBeenCalled();
  });

  it('ignore les payloads sans status', async () => {
    const { status } = await buildComposable('run-abc');
    await nextTick();

    // Payload invalide (manque status)
    // @ts-expect-error — test volontaire d'un payload malformé
    capturedOnCallback?.({ new: { id: 'run-abc' } });
    await nextTick();

    // status ne doit pas changer
    expect(status.value).toBeNull();
  });
});

describe('useHarnessRunRealtime — catch-up polling au SUBSCRIBED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnCallback = null;
    capturedSubscribeCallback = null;
    mockChannel = createMockChannel();
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('appelle $fetch immédiatement après SUBSCRIBED pour catch-up', async () => {
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'QUEUED', checksJson: null },
    });

    await buildComposable('run-abc');
    await nextTick();

    capturedSubscribeCallback?.('SUBSCRIBED');
    await nextTick();

    expect(mockFetch).toHaveBeenCalledWith('/api/me/harness-runs/run-abc');
  });

  it('met à jour status depuis le catch-up poll après SUBSCRIBED', async () => {
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'RUNNING', checksJson: null },
    });

    const { status } = await buildComposable('run-abc');
    await nextTick();

    capturedSubscribeCallback?.('SUBSCRIBED');
    await nextTick(); // attendre la résolution du $fetch

    expect(status.value).toBe('RUNNING');
  });
});

describe('useHarnessRunRealtime — reconnexion et fallback polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    capturedOnCallback = null;
    capturedSubscribeCallback = null;
    mockChannel = createMockChannel();
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'RUNNING', checksJson: null },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  // MAX_WS_RETRIES=3 signifie 3 reconnexions possibles.
  // Fallback déclenché après la 4e erreur (wsRetryCount=3 >= MAX_WS_RETRIES=3).
  it('passe en fallback polling après MAX_WS_RETRIES+1 échecs WS (3 retries + 1)', async () => {
    const { isFallbackPolling } = await buildComposable('run-abc');
    await nextTick();

    // 3 erreurs + reconnects
    await triggerWsErrors(3);

    // 4e erreur → wsRetryCount=3 >= MAX_WS_RETRIES=3 → FALLBACK
    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();

    expect(isFallbackPolling.value).toBe(true);
  });

  it('le fallback polling appelle $fetch périodiquement', async () => {
    const { isFallbackPolling } = await buildComposable('run-abc');
    await nextTick();

    // Forcer le fallback (3 retries + 4e erreur)
    await triggerWsErrors(3);
    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();

    expect(isFallbackPolling.value).toBe(true);
    const callsAfterFallback = mockFetch.mock.calls.length;

    // Avancer de 10s → au moins un appel de polling supplémentaire
    await vi.advanceTimersByTimeAsync(10_100);
    expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterFallback);
  });

  it("planifie une reconnexion avec backoff après CHANNEL_ERROR", async () => {
    await buildComposable('run-abc');
    await nextTick();

    const initialChannelCalls = mockSupabaseClient.channel.mock.calls.length;

    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();
    await vi.advanceTimersByTimeAsync(1100);

    // Un nouveau subscribe doit avoir été tenté
    expect(mockSupabaseClient.channel.mock.calls.length).toBeGreaterThan(initialChannelCalls);
  });

  it("planifie une reconnexion avec backoff après CLOSED", async () => {
    await buildComposable('run-abc');
    await nextTick();

    const initialChannelCalls = mockSupabaseClient.channel.mock.calls.length;

    capturedSubscribeCallback?.('CLOSED');
    await nextTick();
    await vi.advanceTimersByTimeAsync(1100);

    expect(mockSupabaseClient.channel.mock.calls.length).toBeGreaterThan(initialChannelCalls);
  });

  it("connectionError est défini après CHANNEL_ERROR", async () => {
    const { connectionError } = await buildComposable('run-abc');
    await nextTick();

    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();

    expect(connectionError.value).toBe('realtime.connectionError');
  });

  it("isConnected passe à false après CHANNEL_ERROR", async () => {
    const { isConnected } = await buildComposable('run-abc');
    await nextTick();

    capturedSubscribeCallback?.('SUBSCRIBED');
    await nextTick();
    expect(isConnected.value).toBe(true);

    capturedSubscribeCallback?.('CHANNEL_ERROR');
    await nextTick();
    expect(isConnected.value).toBe(false);
  });
});

describe('useHarnessRunRealtime — nettoyage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnCallback = null;
    capturedSubscribeCallback = null;
    mockChannel = createMockChannel();
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockFetch.mockResolvedValue({
      harnessRun: { id: 'run-abc', status: 'RUNNING', checksJson: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('appelle removeChannel au unmount', async () => {
    const { useHarnessRunRealtime } = await import('~/composables/useHarnessRunRealtime');
    const testRunId = ref<string | null>('run-abc');

    const TestComponent = defineComponent({
      setup() {
        useHarnessRunRealtime(testRunId);
        return {};
      },
      template: '<div />',
    });

    const wrapper = mount(TestComponent);
    await nextTick();
    wrapper.unmount();
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('réinitialise le statut quand runId change', async () => {
    const { status, checksJson, runIdRef } = await buildComposable('run-abc');
    await nextTick();

    capturedOnCallback?.({ new: { id: 'run-abc', status: 'RUNNING', checks_json: null } });
    await nextTick();

    expect(status.value).toBe('RUNNING');

    // Changer runId → reset
    runIdRef.value = 'run-xyz';
    await nextTick();

    expect(status.value).toBeNull();
    expect(checksJson.value).toBeNull();
  });

  it("désouscrit de l'ancien channel avant de souscrire au nouveau", async () => {
    const { runIdRef } = await buildComposable('run-abc');
    await nextTick();

    const initialRemoveCalls = mockRemoveChannel.mock.calls.length;

    runIdRef.value = 'run-xyz';
    await nextTick();

    // removeChannel doit avoir été appelé pour l'ancien channel
    expect(mockRemoveChannel.mock.calls.length).toBeGreaterThan(initialRemoveCalls);
  });

  it('ne crée pas de subscription si runId devient null', async () => {
    const { runIdRef } = await buildComposable('run-abc');
    await nextTick();

    const channelCallsBefore = mockSupabaseClient.channel.mock.calls.length;

    runIdRef.value = null;
    await nextTick();

    // Aucune nouvelle subscription créée
    expect(mockSupabaseClient.channel.mock.calls.length).toBe(channelCallsBefore);
  });
});
