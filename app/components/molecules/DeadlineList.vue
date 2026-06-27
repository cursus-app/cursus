<script setup lang="ts">
/**
 * DeadlineList — Molecule « Prochaines échéances ».
 *
 * Affiche une liste triée des prochains modules avec leur date limite
 * et le statut de progression de l'utilisateur courant.
 *
 * Accessibilité :
 *   - Liste sémantique <ul> avec <li>
 *   - Date formatée avec <time datetime="...">
 *   - Indicateurs de statut avec aria-label
 *
 * ST-13.1
 */
import type { DashboardDeadline } from '~/composables/useDashboard';

interface Props {
  deadlines: DashboardDeadline[];
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const { t, locale } = useI18n();

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function statusIcon(status: string | null): string {
  if (status === 'VALIDE' || status === 'VALIDE_OVERRIDE') { return 'i-tabler-circle-check'; }
  if (status === 'SOUMIS') { return 'i-tabler-clock-check'; }
  if (status === 'EN_RETARD' || status === 'EN_ALERTE') { return 'i-tabler-alert-triangle'; }
  if (status === 'BLOQUE') { return 'i-tabler-ban'; }
  return 'i-tabler-circle-dashed';
}

function statusColor(status: string | null): string {
  if (status === 'VALIDE' || status === 'VALIDE_OVERRIDE') { return 'text-success-fg'; }
  if (status === 'SOUMIS') { return 'text-accent'; }
  if (status === 'EN_RETARD' || status === 'EN_ALERTE') { return 'text-warning-fg'; }
  if (status === 'BLOQUE') { return 'text-danger-fg'; }
  return 'text-text-muted';
}

function statusAriaLabel(status: string | null): string {
  const map: Record<string, string> = {
    VALIDE: t('dashboard.deadlines.status.validated'),
    VALIDE_OVERRIDE: t('dashboard.deadlines.status.validated'),
    SOUMIS: t('dashboard.deadlines.status.submitted'),
    EN_COURS: t('dashboard.deadlines.status.inProgress'),
    EN_RETARD: t('dashboard.deadlines.status.late'),
    EN_ALERTE: t('dashboard.deadlines.status.alert'),
    BLOQUE: t('dashboard.deadlines.status.blocked'),
    A_VENIR: t('dashboard.deadlines.status.upcoming'),
  };
  return map[status ?? ''] ?? t('dashboard.deadlines.status.upcoming');
}
</script>

<template>
  <section aria-labelledby="deadlines-heading">
    <h2
      id="deadlines-heading"
      class="mb-4 text-sm font-semibold tracking-wide text-text-subtle uppercase"
    >
      {{ t('dashboard.deadlines.title') }}
    </h2>

    <!-- Skeleton -->
    <template v-if="props.isLoading">
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3">
          <CSkeleton class="size-5 rounded-full" :rounded="true" />
          <div class="flex-1">
            <CSkeleton class="mb-1.5 h-4 w-3/4" />
            <CSkeleton class="h-3 w-20" />
          </div>
        </div>
      </div>
    </template>

    <!-- État vide -->
    <template v-else-if="props.deadlines.length === 0">
      <p class="text-sm text-text-muted">
        {{ t('dashboard.deadlines.empty') }}
      </p>
    </template>

    <!-- Liste -->
    <ul v-else class="space-y-3" role="list">
      <li
        v-for="deadline in props.deadlines"
        :key="deadline.cohortModuleId"
        class="flex items-center gap-3"
      >
        <!-- Indicateur de statut -->
        <span
          :class="[statusIcon(deadline.progressionStatus), 'size-5 shrink-0', statusColor(deadline.progressionStatus)]"
          :aria-label="statusAriaLabel(deadline.progressionStatus)"
          role="img"
        />

        <!-- Contenu -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-text-strong">
            {{ deadline.moduleTitle }}
          </p>
          <time
            :datetime="deadline.dueDate"
            class="text-xs text-text-muted"
          >
            {{ formatDate(deadline.dueDate) }}
          </time>
        </div>
      </li>
    </ul>
  </section>
</template>
