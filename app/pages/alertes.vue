<script setup lang="ts">
/**
 * Page /alertes — gestion des alertes côté formateur.
 *
 * Fonctionnalités :
 *  - Barre de filtres : type, statut (ouverte/résolue), recherche stagiaire
 *  - Liste paginée de AlertCard (20/page)
 *  - Clic sur une carte → AlertPanel (drawer latéral)
 *  - Actions : résoudre, commenter
 *
 * Auth : FORMATEUR_PRINCIPAL ou CO_FORMATEUR uniquement.
 * ST-08.3 — TT-08.3.1
 */
import type { AlertKind } from '@prisma/client';
import type { AlertItem, AlertKindFilter, AlertStatusFilter } from '~/composables/useAlerts';
import { useAlerts } from '~/composables/useAlerts';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Alertes — Cursus', robots: 'noindex' });

const { t } = useI18n();
const toast = useToast();

// ─── Composable alertes ─────────────────────────────────────────────────────

const { alerts, meta, filters, isLoading, error, fetch, resolve, setFilter, setPage } = useAlerts();

// ─── Filtres ─────────────────────────────────────────────────────────────────

const ALL_KINDS: { label: string; value: AlertKindFilter }[] = [
  { label: t('alerts.filters.all'), value: 'all' },
  { label: t('alerts.kinds.SUBMISSION_LATE'), value: 'SUBMISSION_LATE' },
  { label: t('alerts.kinds.QUIZ_REPEATEDLY_FAILED'), value: 'QUIZ_REPEATEDLY_FAILED' },
  { label: t('alerts.kinds.SUBMISSION_REPEATEDLY_FAILED'), value: 'SUBMISSION_REPEATEDLY_FAILED' },
  { label: t('alerts.kinds.STAGIAIRE_BLOCKED'), value: 'STAGIAIRE_BLOCKED' },
  { label: t('alerts.kinds.PROGRESS_STALLED'), value: 'PROGRESS_STALLED' },
  { label: t('alerts.kinds.CAPSTONE_OVERDUE'), value: 'CAPSTONE_OVERDUE' },
];

const STATUS_OPTIONS: { label: string; value: AlertStatusFilter }[] = [
  { label: t('alerts.filters.open'), value: 'open' },
  { label: t('alerts.filters.resolved'), value: 'resolved' },
];

const searchInput = ref('');

const debouncedSearch = useDebounceFn((val: string) => {
  setFilter('search', val);
}, 400);

watch(searchInput, (val) => {
  debouncedSearch(val);
});

// ─── Panneau détail ─────────────────────────────────────────────────────────

const selectedAlert = ref<AlertItem | null>(null);
const isPanelOpen = ref(false);

function openPanel(id: string) {
  const found = alerts.value.find((a) => a.id === id);
  if (found) {
    selectedAlert.value = found;
    isPanelOpen.value = true;
  }
}

// ─── Resolve ─────────────────────────────────────────────────────────────────

async function handleResolve(id: string) {
  try {
    await resolve(id);
    toast.add({
      title: t('alerts.resolveSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

// ─── Chargement initial + re-fetch sur changement de filtres ─────────────────

watch(
  () => ({ ...filters }),
  async () => {
    await fetch();
  },
  { immediate: true, deep: true },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const selectedKind = computed({
  get: () => filters.kind,
  set: (val) => setFilter('kind', val as AlertKindFilter),
});

const selectedStatus = computed({
  get: () => filters.status,
  set: (val) => setFilter('status', val as AlertStatusFilter),
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <!-- En-tête -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('alerts.title') }}
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          {{ t('alerts.subtitle') }}
        </p>
      </div>
      <!-- Compteur total -->
      <UBadge v-if="meta.total > 0" color="neutral" variant="subtle" size="lg">
        {{ meta.total }}
      </UBadge>
    </div>

    <!-- ─── Barre de filtres ──────────────────────────────────────────── -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <!-- Toggle statut -->
      <div
        class="flex rounded-lg border border-border-subtle bg-surface"
        role="group"
        :aria-label="t('alerts.filters.statusLabel')"
      >
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="opt.value"
          :class="[
            'px-3 py-1.5 text-sm transition-colors first:rounded-l-lg last:rounded-r-lg',
            selectedStatus === opt.value
              ? 'bg-accent text-accent-text'
              : 'text-text-muted hover:bg-muted',
          ]"
          :aria-pressed="selectedStatus === opt.value"
          @click="selectedStatus = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Sélecteur de type -->
      <USelect
        v-model="selectedKind"
        :options="ALL_KINDS"
        option-attribute="label"
        value-attribute="value"
        :placeholder="t('alerts.filters.kindPlaceholder')"
        size="sm"
        class="w-52"
        :aria-label="t('alerts.filters.kindLabel')"
      />

      <!-- Recherche stagiaire -->
      <UInput
        v-model="searchInput"
        :placeholder="t('alerts.filters.searchPlaceholder')"
        icon="i-tabler-search"
        size="sm"
        class="w-56"
        :aria-label="t('alerts.filters.searchLabel')"
      />

      <!-- Reset -->
      <UButton
        v-if="filters.kind !== 'all' || filters.status !== 'open' || filters.search"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-tabler-x"
        @click="
          () => {
            setFilter('kind', 'all');
            setFilter('status', 'open');
            setFilter('search', '');
            searchInput = '';
          }
        "
      >
        {{ t('alerts.filters.reset') }}
      </UButton>
    </div>

    <!-- ─── État d'erreur ─────────────────────────────────────────────── -->
    <div
      v-if="error"
      class="mb-4 flex items-center gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
      role="alert"
    >
      <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" />
      {{ error }}
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="t('common.retry')"
        @click="fetch()"
      >
        {{ t('common.retry') }}
      </UButton>
    </div>

    <!-- ─── Skeleton chargement ───────────────────────────────────────── -->
    <div v-if="isLoading" class="space-y-3" aria-busy="true" :aria-label="t('common.loading')">
      <div v-for="i in 5" :key="i" class="skeleton h-24 rounded-xl" />
    </div>

    <!-- ─── État vide ─────────────────────────────────────────────────── -->
    <div
      v-else-if="alerts.length === 0 && !error"
      class="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface py-16 text-center"
      role="status"
    >
      <div class="flex size-14 items-center justify-center rounded-full bg-muted">
        <UIcon name="i-tabler-bell-off" class="size-7 text-text-subtle" />
      </div>
      <div>
        <p class="font-medium text-text-default">{{ t('alerts.empty.title') }}</p>
        <p class="mt-1 text-sm text-text-muted">{{ t('alerts.empty.description') }}</p>
      </div>
    </div>

    <!-- ─── Liste d'alertes ───────────────────────────────────────────── -->
    <ul
      v-else-if="!isLoading"
      class="space-y-3"
      aria-label="t('alerts.list.ariaLabel')"
      role="list"
    >
      <li v-for="alert in alerts" :key="alert.id" role="listitem">
        <AlertCard
          :id="alert.id"
          :kind="alert.kind as AlertKind"
          :severity="alert.severity"
          :context="alert.context as Record<string, unknown>"
          :created-at="alert.createdAt"
          :resolved-at="alert.resolvedAt"
          :resolved-by-id="alert.resolvedById"
          :user="alert.user"
          :resolved-by="alert.resolvedBy"
          @click="openPanel"
          @resolve="handleResolve"
        />
      </li>
    </ul>

    <!-- ─── Pagination ────────────────────────────────────────────────── -->
    <div
      v-if="meta.totalPages > 1"
      class="mt-6 flex items-center justify-center gap-2"
      aria-label="t('alerts.pagination.ariaLabel')"
    >
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-tabler-chevron-left"
        :disabled="filters.page <= 1 || isLoading"
        :aria-label="t('molecules.dataTable.previous')"
        @click="setPage(filters.page - 1)"
      />
      <span class="text-sm text-text-muted">
        {{ t('molecules.dataTable.pageInfo', { page: filters.page, total: meta.totalPages }) }}
      </span>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-tabler-chevron-right"
        :disabled="filters.page >= meta.totalPages || isLoading"
        :aria-label="t('molecules.dataTable.next')"
        @click="setPage(filters.page + 1)"
      />
    </div>

    <!-- ─── Panneau détail ────────────────────────────────────────────── -->
    <AlertPanel
      :alert="selectedAlert"
      :open="isPanelOpen"
      @update:open="isPanelOpen = $event"
      @resolve="handleResolve"
    />
  </div>
</template>
