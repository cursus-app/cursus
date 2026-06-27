<script setup lang="ts">
/**
 * Page /mon-parcours — timeline des soumissions du stagiaire authentifié.
 *
 * Fonctionnalités :
 *  - Onglets de filtre (Tous, Validés, Échoués, En cours)
 *  - Liste sémantique <ol> des soumissions (plus récentes en premier)
 *  - Skeleton loaders pendant le chargement
 *  - État vide avec CTA
 *  - Pagination (20 items/page)
 *  - A11y : rôle list, keyboard navigation, status ARIA labels
 *  - LCP < 1.5s
 *
 * ST-05.4
 */

import type { SubmissionStatusFilter } from '~~/app/composables/useMySubmissions';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();

useSeoMeta({
  title: t('submissions.page.title') + ' — Cursus',
  robots: 'noindex',
});

const { submissions, meta, isLoading, error, filter, setFilter, setPage, fetch } =
  useMySubmissions();

// Chargement initial
onMounted(() => {
  void fetch();
});

interface FilterTab {
  key: SubmissionStatusFilter;
  labelKey: string;
}

const filterTabs: FilterTab[] = [
  { key: 'all', labelKey: 'submissions.filter.all' },
  { key: 'VALIDATED', labelKey: 'submissions.filter.validated' },
  { key: 'FAILED', labelKey: 'submissions.filter.failed' },
  { key: 'RUNNING', labelKey: 'submissions.filter.running' },
  { key: 'PENDING', labelKey: 'submissions.filter.pending' },
];

// Active tab computed pour le style
function isActive(tabKey: SubmissionStatusFilter) {
  return filter.value === tabKey;
}

// Skeletons pendant le chargement initial
const SKELETON_COUNT = 5;
</script>

<template>
  <main id="main-content" class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <!-- Titre page -->
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('submissions.page.title') }}
      </h1>
      <p class="mt-1 text-sm text-text-muted">
        {{ t('submissions.page.subtitle') }}
      </p>
    </div>

    <!-- Onglets de filtre -->
    <nav
      :aria-label="t('submissions.filter.ariaLabel')"
      class="mb-6 flex flex-wrap gap-2"
      role="tablist"
    >
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="isActive(tab.key)"
        :tabindex="isActive(tab.key) ? 0 : -1"
        :class="[
          'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
          isActive(tab.key)
            ? 'bg-accent text-accent-text'
            : 'bg-muted text-text-muted hover:bg-surface hover:text-text-default',
        ]"
        @click="setFilter(tab.key)"
        @keydown.enter="setFilter(tab.key)"
        @keydown.space.prevent="setFilter(tab.key)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </nav>

    <!-- Erreur -->
    <div
      v-if="error && !isLoading"
      role="alert"
      class="mb-6 flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-fg"
    >
      <span class="i-tabler-alert-triangle size-4 shrink-0" aria-hidden="true" />
      {{ error }}
      <UButton size="xs" variant="ghost" color="error" class="ml-auto" @click="void fetch()">
        {{ t('common.retry') }}
      </UButton>
    </div>

    <!-- Skeletons pendant le chargement -->
    <template v-if="isLoading">
      <ol class="space-y-3" :aria-label="t('submissions.list.ariaLabel')" aria-busy="true">
        <li v-for="i in SKELETON_COUNT" :key="i">
          <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-col gap-2">
                <CSkeleton height="12" width="120" />
                <CSkeleton height="18" width="240" />
                <CSkeleton height="12" width="80" />
              </div>
              <CSkeleton height="24" width="80" :rounded="true" />
            </div>
          </div>
        </li>
      </ol>
    </template>

    <!-- État vide -->
    <template v-else-if="!isLoading && submissions.length === 0">
      <AppEmptyState
        :title="t('submissions.empty.title')"
        :description="
          filter === 'all'
            ? t('submissions.empty.descriptionAll')
            : t('submissions.empty.descriptionFiltered')
        "
        icon="i-tabler-inbox"
        :action-label="filter === 'all' ? t('submissions.empty.cta') : undefined"
        :action-icon="filter === 'all' ? 'i-tabler-arrow-right' : undefined"
        @action="navigateTo('/')"
      />
    </template>

    <!-- Liste des soumissions -->
    <template v-else>
      <!-- Compteur -->
      <p class="mb-4 text-sm text-text-muted" aria-live="polite">
        {{
          t('submissions.list.count', {
            count: meta.total,
          })
        }}
      </p>

      <ol class="space-y-3" :aria-label="t('submissions.list.ariaLabel')">
        <li v-for="submission in submissions" :key="submission.id">
          <SubmissionCard :submission="submission" />
        </li>
      </ol>

      <!-- Pagination -->
      <nav
        v-if="meta.totalPages > 1"
        :aria-label="t('submissions.pagination.ariaLabel')"
        class="mt-8 flex items-center justify-center gap-2"
      >
        <UButton
          :disabled="meta.page <= 1"
          :aria-label="t('molecules.dataTable.previous')"
          variant="ghost"
          color="neutral"
          leading-icon="i-tabler-chevron-left"
          @click="setPage(meta.page - 1)"
        >
          {{ t('molecules.dataTable.previous') }}
        </UButton>

        <span class="text-sm text-text-muted">
          {{
            t('molecules.dataTable.pageInfo', {
              page: meta.page,
              total: meta.totalPages,
            })
          }}
        </span>

        <UButton
          :disabled="meta.page >= meta.totalPages"
          :aria-label="t('molecules.dataTable.next')"
          variant="ghost"
          color="neutral"
          trailing-icon="i-tabler-chevron-right"
          @click="setPage(meta.page + 1)"
        >
          {{ t('molecules.dataTable.next') }}
        </UButton>
      </nav>
    </template>
  </main>
</template>
