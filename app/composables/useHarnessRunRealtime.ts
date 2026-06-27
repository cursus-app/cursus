/**
 * useHarnessRunRealtime — subscription Supabase Realtime sur harness_runs.
 *
 * Fournit :
 *  - status       : HarnessStatus actuel du run (null si inconnu)
 *  - checksJson   : résultats bruts des checks (null si non encore reçus)
 *  - isConnected  : true si WS actif
 *  - connectionError : message d'erreur si connexion échouée
 *
 * Stratégie de résilience :
 *  1. Connexion WebSocket via Supabase Realtime
 *  2. Reconnexion automatique avec backoff exponentiel (1s, 2s, 4s, 8s, max 30s)
 *  3. Après 3 tentatives WS échouées → fallback polling toutes les 10s
 *  4. Nettoyage automatique au unmount
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

// On réutilise la définition depuis Prisma sans importer le runtime (build tree-shaking)
export type HarnessStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';

const TERMINAL_STATUSES: ReadonlySet<HarnessStatus> = new Set([
  'SUCCESS',
  'FAILURE',
  'TIMEOUT',
  'CANCELLED',
]);

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000] as const;
const MAX_WS_RETRIES = 3;
const POLLING_INTERVAL_MS = 10_000;

interface HarnessRunPayload {
  id: string;
  status: HarnessStatus;
  checks_json: unknown;
}

interface SubmissionApiResponse {
  harnessRun: {
    id: string;
    status: HarnessStatus;
    checksJson: unknown;
  } | null;
}

export function useHarnessRunRealtime(runId: Ref<string | null>) {
  const status = ref<HarnessStatus | null>(null);
  const checksJson = ref<unknown>(null);
  const isConnected = ref<boolean>(false);
  const connectionError = ref<string | null>(null);
  const isFallbackPolling = ref<boolean>(false);

  let channel: RealtimeChannel | null = null;
  let wsRetryCount = 0;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let isUnmounted = false;

  // Composables Nuxt — disponibles uniquement en contexte composable
  const supabase = useSupabaseClient();
  const { t } = useI18n();
  const toast = useAppToast();

  // Conserve l'ID du run pour lequel une toast de complétion a été affichée,
  // afin d'éviter les doublons si le composant re-monte ou reçoit un même événement.
  const toastedRunId = ref<string | null>(null);

  /** Méthode de polling : interroge l'API pour récupérer le statut actuel. */
  async function pollCurrentStatus() {
    const id = runId.value;
    if (!id || isUnmounted) {
      return;
    }

    try {
      const data = await $fetch<SubmissionApiResponse>(`/api/me/harness-runs/${id}`);
      if (data.harnessRun) {
        const newStatus = data.harnessRun.status;
        const prevStatus = status.value;
        status.value = newStatus;
        checksJson.value = data.harnessRun.checksJson;

        // Notifier si transition vers état terminal
        if (newStatus !== prevStatus && TERMINAL_STATUSES.has(newStatus)) {
          handleTerminalTransition(id, newStatus);
        }
      }
    } catch {
      // Silencieux : le polling se re-déclenchera à l'intervalle suivant
    }
  }

  /** Démarre le fallback polling. */
  function startFallbackPolling() {
    if (pollingInterval !== null || isUnmounted) {
      return;
    }
    isFallbackPolling.value = true;
    isConnected.value = false;
    connectionError.value = t('realtime.fallbackPolling');
    void pollCurrentStatus(); // premier appel immédiat
    pollingInterval = setInterval(() => void pollCurrentStatus(), POLLING_INTERVAL_MS);
  }

  /** Arrête le fallback polling. */
  function stopFallbackPolling() {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    isFallbackPolling.value = false;
  }

  /** Affiche un toast lors de la transition vers un état terminal. */
  function handleTerminalTransition(id: string, terminalStatus: HarnessStatus) {
    if (toastedRunId.value === id) {
      return;
    }
    toastedRunId.value = id;

    if (terminalStatus === 'SUCCESS') {
      toast.success(t('realtime.toast.success'), t('realtime.toast.successDescription'));
    } else {
      toast.danger(t('realtime.toast.failure'), t('realtime.toast.failureDescription'));
    }
  }

  /** Déconnecte le channel Realtime actif. */
  function disconnectChannel() {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    isConnected.value = false;
  }

  /** Planifie une reconnexion WS avec backoff exponentiel. */
  function scheduleReconnect() {
    if (isUnmounted) {
      return;
    }

    if (wsRetryCount >= MAX_WS_RETRIES) {
      // Trop d'échecs WS → basculer en fallback polling
      startFallbackPolling();
      return;
    }

    const delay = BACKOFF_DELAYS[Math.min(wsRetryCount, BACKOFF_DELAYS.length - 1)] ?? 30000;
    wsRetryCount++;

    backoffTimer = setTimeout(() => {
      if (!isUnmounted) {
        subscribe(runId.value);
      }
    }, delay);
  }

  /** Annule le timer de reconnexion en cours. */
  function cancelReconnect() {
    if (backoffTimer !== null) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
  }

  /** Ouvre une subscription Realtime pour un run donné. */
  function subscribe(id: string | null) {
    if (!id || isUnmounted) {
      return;
    }

    disconnectChannel();
    stopFallbackPolling();

    channel = supabase
      .channel(`harness-run-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'harness_runs',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as HarnessRunPayload;
          if (!row?.status) {
            return;
          }

          const prevStatus = status.value;
          status.value = row.status;
          checksJson.value = row.checks_json ?? null;

          if (row.status !== prevStatus && TERMINAL_STATUSES.has(row.status)) {
            handleTerminalTransition(id, row.status);
          }
        },
      )
      .subscribe((channelStatus) => {
        if (isUnmounted) {
          return;
        }

        if (channelStatus === 'SUBSCRIBED') {
          isConnected.value = true;
          connectionError.value = null;
          wsRetryCount = 0;
          // Récupérer l'état actuel immédiatement (catch-up)
          void pollCurrentStatus();
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          isConnected.value = false;
          connectionError.value = t('realtime.connectionError');
          disconnectChannel();
          scheduleReconnect();
        } else if (channelStatus === 'CLOSED') {
          isConnected.value = false;
          if (!isUnmounted) {
            scheduleReconnect();
          }
        }
      });
  }

  // Réagir aux changements de runId
  watch(
    runId,
    (newId, oldId) => {
      if (newId === oldId) {
        return;
      }

      cancelReconnect();
      stopFallbackPolling();
      disconnectChannel();

      // Réinitialiser l'état
      status.value = null;
      checksJson.value = null;
      isConnected.value = false;
      connectionError.value = null;
      wsRetryCount = 0;
      isFallbackPolling.value = false;

      if (newId) {
        subscribe(newId);
      }
    },
    { immediate: true },
  );

  // Nettoyage au unmount
  onUnmounted(() => {
    isUnmounted = true;
    cancelReconnect();
    stopFallbackPolling();
    disconnectChannel();
  });

  return {
    status: readonly(status),
    checksJson: readonly(checksJson),
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    isFallbackPolling: readonly(isFallbackPolling),
  };
}
