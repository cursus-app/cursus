<script setup lang="ts">
/**
 * HarnessStatus — affichage temps réel du statut d'un HarnessRun.
 *
 * S'abonne à Supabase Realtime sur la table `harness_runs` pour recevoir
 * les mises à jour en push. Utilise un polling de 10s comme fallback
 * si Realtime est bloqué.
 *
 * Gestion de la déconnexion : reconnexion automatique via le channel Supabase.
 * Nettoyage à l'unmount pour éviter les fuites mémoire.
 *
 * Affiche un timeout warning si le HarnessRun reste RUNNING > 10 min.
 *
 * Cf. ST-05.2 — TT-05.2.3.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { HarnessRunSummary } from '~~/shared/schemas/submission';
import type { CheckResult, ChecksJson } from '~~/shared/types/harness';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  submissionId: string;
  harnessRunId: string;
}

const props = defineProps<Props>();

// ─── Composables ─────────────────────────────────────────────────────────────

const { t } = useT();
const supabase = useSupabaseClient();
const reducedMotion = useReducedMotion();

// ─── État ─────────────────────────────────────────────────────────────────────

const run = ref<HarnessRunSummary | null>(null);
const isLoading = ref(true);
const fetchError = ref<string | null>(null);
const isTimeoutWarning = ref(false);

// ─── Constantes ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000; // 10 secondes
const TIMEOUT_WARNING_MS = 10 * 60 * 1_000; // 10 minutes

// ─── Chargement initial ───────────────────────────────────────────────────────

async function fetchRun(): Promise<void> {
  try {
    const data = await $fetch(`/api/me/submissions/${props.submissionId}`);
    const submission = data as { latestHarnessRun: HarnessRunSummary | null };
    if (submission.latestHarnessRun) {
      run.value = submission.latestHarnessRun;
    }
    fetchError.value = null;
  } catch {
    fetchError.value = t('submission.status.fetchError');
  } finally {
    isLoading.value = false;
  }
}

// ─── Vérification timeout ─────────────────────────────────────────────────────

function checkTimeout(): void {
  if (!run.value) {
    return;
  }
  if (run.value.status !== 'RUNNING' && run.value.status !== 'QUEUED') {
    return;
  }

  const startedAt = run.value.startedAt ? new Date(run.value.startedAt).getTime() : null;
  const createdAt = new Date(run.value.createdAt).getTime();
  const reference = startedAt ?? createdAt;

  if (Date.now() - reference > TIMEOUT_WARNING_MS) {
    isTimeoutWarning.value = true;
  }
}

// ─── Polling fallback ────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(): void {
  if (pollTimer) {
    return;
  }
  pollTimer = setInterval(async () => {
    if (isFinished.value) {
      stopPolling();
      return;
    }
    await fetchRun();
    checkTimeout();
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ─── Realtime subscription ───────────────────────────────────────────────────

let realtimeChannel: RealtimeChannel | null = null;

interface RealtimePayload {
  new: Record<string, unknown>;
}

function subscribeRealtime(): void {
  realtimeChannel = supabase
    .channel(`harness-run-${props.harnessRunId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'harness_runs',
        filter: `id=eq.${props.harnessRunId}`,
      },
      (payload: RealtimePayload) => {
        const updated = payload.new;
        if (run.value) {
          run.value = {
            ...run.value,
            status: (updated['status'] as string) ?? run.value.status,
            startedAt: (updated['started_at'] as string | null) ?? run.value.startedAt,
            finishedAt: (updated['finished_at'] as string | null) ?? run.value.finishedAt,
            checksJson: updated['checks_json'] ?? run.value.checksJson,
            errorMessage: (updated['error_message'] as string | null) ?? run.value.errorMessage,
          };
        }
        checkTimeout();

        // Arrêt du polling quand on reçoit un événement Realtime
        if (isFinished.value) {
          stopPolling();
        }
      },
    )
    .subscribe();
}

function unsubscribeRealtime(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel).catch(() => {});
    realtimeChannel = null;
  }
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const isFinished = computed(() => {
  const finishedStatuses = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED'];
  return run.value ? finishedStatuses.includes(run.value.status) : false;
});

const statusIcon = computed(() => {
  if (!run.value) {
    return 'i-tabler-clock';
  }
  switch (run.value.status) {
    case 'QUEUED':
      return 'i-tabler-clock';
    case 'RUNNING':
      return 'i-tabler-loader';
    case 'SUCCESS':
      return 'i-tabler-circle-check';
    case 'FAILURE':
      return 'i-tabler-circle-x';
    case 'TIMEOUT':
      return 'i-tabler-clock-off';
    case 'CANCELLED':
      return 'i-tabler-circle-minus';
    default:
      return 'i-tabler-help';
  }
});

const statusColor = computed((): 'neutral' | 'success' | 'error' | 'warning' | 'info' => {
  if (!run.value) {
    return 'neutral';
  }
  switch (run.value.status) {
    case 'QUEUED':
    case 'RUNNING':
      return 'info';
    case 'SUCCESS':
      return 'success';
    case 'FAILURE':
    case 'TIMEOUT':
    case 'CANCELLED':
      return 'error';
    default:
      return 'neutral';
  }
});

const statusLabel = computed(() => {
  if (!run.value) {
    return t('submission.status.loading');
  }
  return t(`submission.status.${run.value.status.toLowerCase()}`);
});

const checks = computed<CheckResult[]>(() => {
  const json = run.value?.checksJson;
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return [];
  }
  const envelope = json as ChecksJson;
  return Array.isArray(envelope.checks) ? envelope.checks : [];
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchRun();
  subscribeRealtime();
  startPolling();
  checkTimeout();
});

onUnmounted(() => {
  stopPolling();
  unsubscribeRealtime();
});
</script>

<template>
  <div class="flex flex-col gap-4" aria-live="polite" aria-atomic="false">
    <!-- Chargement initial -->
    <div v-if="isLoading" class="flex items-center gap-3 text-text-muted">
      <UIcon name="i-tabler-loader" class="animate-spin" aria-hidden="true" />
      <span>{{ t('submission.status.loading') }}</span>
    </div>

    <!-- Erreur de chargement -->
    <UAlert
      v-else-if="fetchError"
      color="error"
      variant="soft"
      icon="i-tabler-alert-circle"
      :description="fetchError"
    />

    <template v-else-if="run">
      <!-- Bandeau statut principal -->
      <UAlert
        :color="statusColor"
        variant="soft"
        :icon="statusIcon"
        :title="statusLabel"
        :class="{
          'animate-pulse': (run.status === 'RUNNING' || run.status === 'QUEUED') && !reducedMotion,
        }"
      >
        <template #description>
          <span v-if="run.status === 'QUEUED'">{{ t('submission.status.queuedDescription') }}</span>
          <span v-else-if="run.status === 'RUNNING'">{{
            t('submission.status.runningDescription')
          }}</span>
          <span v-else-if="run.status === 'SUCCESS'">{{
            t('submission.status.successDescription')
          }}</span>
          <span v-else-if="run.status === 'FAILURE'">{{
            t('submission.status.failureDescription')
          }}</span>
          <span v-else-if="run.errorMessage">{{ run.errorMessage }}</span>
        </template>
      </UAlert>

      <!-- Avertissement timeout (>10 min en RUNNING) -->
      <UAlert
        v-if="isTimeoutWarning && (run.status === 'RUNNING' || run.status === 'QUEUED')"
        color="warning"
        variant="soft"
        icon="i-tabler-clock-alert"
        :title="t('submission.status.timeoutWarning.title')"
        :description="t('submission.status.timeoutWarning.description')"
        aria-live="assertive"
      />

      <!-- Rapport de checks (HarnessReport — ST-06.3) -->
      <div v-if="checks.length > 0" class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-text-strong">
          {{ t('submission.status.checksTitle') }}
        </h3>

        <ul class="flex flex-col gap-2" role="list">
          <li
            v-for="check in checks"
            :key="check.check_id"
            class="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface p-3"
          >
            <!-- Icône résultat -->
            <UIcon
              :name="check.status === 'success' ? 'i-tabler-circle-check' : 'i-tabler-circle-x'"
              :class="[
                'mt-0.5 size-4 shrink-0',
                check.status === 'success' ? 'text-success-fg' : 'text-danger-fg',
              ]"
              :aria-label="
                check.status === 'success'
                  ? t('submission.status.checkPassed')
                  : t('submission.status.checkFailed')
              "
            />

            <!-- Contenu check -->
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-text-strong">{{ check.check_id }}</span>
              <span v-if="check.message" class="text-xs text-text-muted">{{ check.message }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Indicateur "analyse en cours" (pas de checks encore) -->
      <div
        v-else-if="run.status === 'RUNNING' || run.status === 'QUEUED'"
        class="flex flex-col gap-3"
        aria-busy="true"
        :aria-valuenow="0"
        :aria-valuemax="100"
        role="progressbar"
        :aria-label="t('submission.status.analysisInProgress')"
      >
        <p class="text-sm text-text-muted">{{ t('submission.status.analysisInProgress') }}</p>

        <!-- Barre de progression animée -->
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            :class="['h-full w-2/3 rounded-full bg-accent', { 'animate-pulse': !reducedMotion }]"
            style="animation-duration: 1.5s"
          />
        </div>
      </div>

      <!-- Horodatage -->
      <div class="flex gap-4 text-xs text-text-subtle">
        <span v-if="run.startedAt">
          {{
            t('submission.status.startedAt', { time: new Date(run.startedAt).toLocaleTimeString() })
          }}
        </span>
        <span v-if="run.finishedAt">
          {{
            t('submission.status.finishedAt', {
              time: new Date(run.finishedAt).toLocaleTimeString(),
            })
          }}
        </span>
      </div>
    </template>
  </div>
</template>
