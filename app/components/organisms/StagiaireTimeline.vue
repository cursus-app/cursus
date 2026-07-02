<script setup lang="ts">
/**
 * StagiaireTimeline — timeline chronologique unifiée de la fiche stagiaire 360.
 *
 * Affiche les événements (submissions, harness_runs, alertes, audit) avec filtres
 * et pagination. Sémantique <ol>/<li> + <time> machine-readable + aria-live.
 *
 * Cf. ST-13.3 — TT-13.3.3
 */
import type { TimelineEvent, TimelineEventType } from '~~/shared/types/timeline';

const props = defineProps<{
  events: TimelineEvent[];
  loading: boolean;
  hasMore: boolean;
  activeFilters: TimelineEventType[];
}>();

const emit = defineEmits<{
  'load-more': [];
  'update:activeFilters': [filters: TimelineEventType[]];
}>();

// ── Filtres ───────────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: TimelineEventType; label: string; icon: string }[] = [
  { value: 'submission', label: 'Livrables', icon: 'i-tabler-package' },
  { value: 'harness_run', label: 'Harnais', icon: 'i-tabler-robot' },
  { value: 'alert', label: 'Alertes', icon: 'i-tabler-bell' },
  { value: 'audit', label: 'Audit', icon: 'i-tabler-shield-check' },
];

function isFilterActive(type: TimelineEventType): boolean {
  return props.activeFilters.includes(type);
}

function toggleFilter(type: TimelineEventType): void {
  const next = isFilterActive(type)
    ? props.activeFilters.filter((f) => f !== type)
    : [...props.activeFilters, type];
  emit('update:activeFilters', next);
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

function eventIcon(type: TimelineEventType): string {
  const map: Record<TimelineEventType, string> = {
    submission: 'i-tabler-package',
    harness_run: 'i-tabler-robot',
    alert: 'i-tabler-bell',
    audit: 'i-tabler-shield-check',
  };
  return map[type];
}

function eventLabel(type: TimelineEventType): string {
  const map: Record<TimelineEventType, string> = {
    submission: 'Livrable',
    harness_run: 'Harnais',
    alert: 'Alerte',
    audit: 'Audit',
  };
  return map[type];
}

function eventBadgeClass(type: TimelineEventType): string {
  const map: Record<TimelineEventType, string> = {
    submission: 'bg-accent-subtle text-accent-text',
    harness_run: 'bg-info-bg text-info-fg',
    alert: 'bg-warning-bg text-warning-fg',
    audit: 'bg-muted text-text-muted',
  };
  return map[type];
}

function eventIconBgClass(type: TimelineEventType): string {
  const map: Record<TimelineEventType, string> = {
    submission: 'bg-accent-subtle text-accent-text',
    harness_run: 'bg-info-bg text-info-fg',
    alert: 'bg-warning-bg text-warning-fg',
    audit: 'bg-muted text-text-muted',
  };
  return map[type];
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "À l'instant";
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `il y a ${days} j`;
  }
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/**
 * Génère un résumé court de l'événement pour l'affichage dans la carte.
 */
function eventSummary(event: TimelineEvent): string {
  if (event.type === 'submission') {
    const module = event.data.moduleName ?? 'module inconnu';
    const statusLabel: Record<string, string> = {
      PENDING: 'En attente',
      RUNNING: 'En cours',
      VALIDATED: 'Validé',
      VALIDATED_OVERRIDE: 'Validé (override)',
      FAILED: 'Échoué',
      TIMEOUT: 'Timeout',
      BLOCKED: 'Bloqué',
    };
    return `${module} — ${statusLabel[event.data.status] ?? event.data.status}`;
  }

  if (event.type === 'harness_run') {
    const statusLabel: Record<string, string> = {
      QUEUED: 'En attente',
      RUNNING: 'En cours',
      SUCCESS: 'Réussi',
      FAILURE: 'Échoué',
      TIMEOUT: 'Timeout',
      CANCELLED: 'Annulé',
    };
    return `Run harnais — ${statusLabel[event.data.status] ?? event.data.status}`;
  }

  if (event.type === 'alert') {
    const kindLabel: Record<string, string> = {
      SUBMISSION_LATE: 'Soumission en retard',
      QUIZ_REPEATEDLY_FAILED: 'Quiz échoué plusieurs fois',
      SUBMISSION_REPEATEDLY_FAILED: 'Soumission échouée plusieurs fois',
      STAGIAIRE_BLOCKED: 'Stagiaire bloqué',
      PROGRESS_STALLED: "Progression à l'arrêt",
      CAPSTONE_OVERDUE: 'Capstone en retard',
    };
    const resolved = event.data.resolvedAt ? ' (résolue)' : '';
    return `${kindLabel[event.data.kind] ?? event.data.kind}${resolved}`;
  }

  if (event.type === 'audit') {
    const actor = event.data.actorName ?? 'Formateur';
    const actionLabel: Record<string, string> = {
      'submission.override.validate': 'a validé manuellement',
      'submission.override.extend': "a étendu l'échéance",
    };
    return `${actor} ${actionLabel[event.data.action] ?? event.data.action}`;
  }

  return '—';
}

function auditHasDiff(event: TimelineEvent): boolean {
  return event.type === 'audit' && !!event.data.diff;
}

function isStatusDanger(event: TimelineEvent): boolean {
  if (event.type === 'submission') {
    return (
      event.data.status === 'FAILED' ||
      event.data.status === 'BLOCKED' ||
      event.data.status === 'TIMEOUT'
    );
  }
  if (event.type === 'harness_run') {
    return event.data.status === 'FAILURE' || event.data.status === 'TIMEOUT';
  }
  if (event.type === 'alert') {
    return event.data.severity === 'HIGH' && !event.data.resolvedAt;
  }
  return false;
}
</script>

<template>
  <section aria-label="Timeline des événements du stagiaire">
    <!-- Filtres par type -->
    <fieldset class="mb-5">
      <legend class="mb-2 text-xs font-medium tracking-wide text-text-subtle uppercase">
        Filtrer par type
      </legend>
      <div class="flex flex-wrap gap-2" role="group">
        <button
          v-for="opt in FILTER_OPTIONS"
          :key="opt.value"
          type="button"
          :aria-pressed="isFilterActive(opt.value)"
          :aria-label="`Filtrer : ${opt.label}${isFilterActive(opt.value) ? ' (actif)' : ''}`"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          :class="
            isFilterActive(opt.value)
              ? 'border-accent bg-accent text-text-on-accent'
              : 'border-border-subtle bg-surface text-text-muted hover:border-border-default hover:text-text-default'
          "
          @click="toggleFilter(opt.value)"
        >
          <UIcon :name="opt.icon" class="size-3.5" aria-hidden="true" />
          {{ opt.label }}
        </button>
      </div>
    </fieldset>

    <!-- Région live pour accessibilité -->
    <div aria-live="polite" aria-atomic="false" class="sr-only">
      <span v-if="loading">Chargement des événements en cours…</span>
    </div>

    <!-- État vide -->
    <div
      v-if="!loading && events.length === 0"
      class="rounded-xl border border-border-subtle bg-surface py-12 text-center"
    >
      <UIcon
        name="i-tabler-history-off"
        class="mx-auto mb-3 size-8 text-text-subtle"
        aria-hidden="true"
      />
      <p class="text-sm text-text-muted">Aucun événement trouvé.</p>
      <p v-if="activeFilters.length > 0" class="mt-1 text-xs text-text-subtle">
        Essayez de retirer des filtres.
      </p>
    </div>

    <!-- Liste chronologique -->
    <ol
      v-else
      class="relative space-y-1 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-px before:bg-border-subtle"
      aria-label="Événements chronologiques"
    >
      <li v-for="event in events" :key="event.id" class="relative">
        <!-- Point sur la ligne de temps -->
        <div
          class="absolute top-3 -left-6 flex size-5 items-center justify-center rounded-full border-2 border-app"
          :class="eventIconBgClass(event.type)"
          aria-hidden="true"
        >
          <UIcon :name="eventIcon(event.type)" class="size-3" />
        </div>

        <!-- Carte événement -->
        <div
          class="ml-2 rounded-lg border bg-surface p-3 transition-colors hover:bg-hover"
          :class="
            isStatusDanger(event) ? 'border-danger-solid/30 bg-danger-bg' : 'border-border-subtle'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <!-- Badge type + résumé -->
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                  :class="eventBadgeClass(event.type)"
                >
                  {{ eventLabel(event.type) }}
                </span>
              </div>
              <p class="text-sm text-text-default">
                {{ eventSummary(event) }}
              </p>
              <!-- Détails d'audit si disponibles -->
              <p v-if="auditHasDiff(event)" class="mt-0.5 text-xs text-text-muted">
                Détails disponibles dans l'audit log
              </p>
            </div>

            <!-- Timestamp -->
            <time
              :datetime="event.timestamp"
              :title="new Date(event.timestamp).toLocaleString('fr-FR')"
              class="shrink-0 text-xs text-text-subtle"
            >
              {{ formatTimestamp(event.timestamp) }}
            </time>
          </div>

          <!-- Info relative -->
          <p class="mt-1 text-[11px] text-text-subtle">
            {{ formatDateRelative(event.timestamp) }}
          </p>
        </div>
      </li>

      <!-- Skeleton pour les nouveaux événements en cours de chargement -->
      <li v-if="loading" aria-busy="true">
        <div class="ml-2 space-y-2">
          <USkeleton class="h-16 rounded-lg" />
          <USkeleton class="h-16 rounded-lg" />
        </div>
      </li>
    </ol>

    <!-- Bouton charger plus -->
    <div v-if="hasMore && !loading" class="mt-4 text-center">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-tabler-refresh"
        aria-label="Charger les événements suivants"
        @click="emit('load-more')"
      >
        Charger plus
      </UButton>
    </div>

    <!-- Fin de liste -->
    <p
      v-if="!hasMore && events.length > 0 && !loading"
      class="mt-4 text-center text-xs text-text-subtle"
    >
      Tous les événements sont affichés ({{ events.length }})
    </p>
  </section>
</template>
