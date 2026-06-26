<script setup lang="ts">
/**
 * Page /cohortes — liste des cohortes avec filtres par statut.
 * Cf. ST-04.1 — TT-04.1.3.
 */
import type { CohorteListItem, CohorteStatus } from '~/composables/useCohorte';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Cohortes — Cursus' });

const { t } = useI18n();
const toast = useToast();
const { canManageCohorte } = usePermission();
const { listCohortes, loading } = useCohorte();

// ─── État des filtres ─────────────────────────────────────────────────────────

const statusFilter = ref<CohorteStatus | undefined>(undefined);
const currentPage = ref(1);
const pageSize = 20;

// ─── Données ──────────────────────────────────────────────────────────────────

const total = ref(0);
const cohortes = ref<CohorteListItem[]>([]);

async function fetchCohortes() {
  try {
    const query: Parameters<typeof listCohortes>[0] = {
      page: currentPage.value,
      limit: pageSize,
    };
    if (statusFilter.value !== undefined) {
      query.status = statusFilter.value;
    }
    const result = await listCohortes(query);
    cohortes.value = result.data;
    total.value = result.total;
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

watch(statusFilter, () => {
  currentPage.value = 1;
  void fetchCohortes();
});

watch(currentPage, () => {
  void fetchCohortes();
});

onMounted(() => {
  void fetchCohortes();
});

// ─── Onglets de statut ────────────────────────────────────────────────────────

const statusTabs: { label: string; value: CohorteStatus | undefined }[] = [
  { label: t('cohortes.filter.all'), value: undefined },
  { label: t('cohortes.status.DRAFT'), value: 'DRAFT' },
  { label: t('cohortes.status.ACTIVE'), value: 'ACTIVE' },
  { label: t('cohortes.status.COMPLETED'), value: 'COMPLETED' },
  { label: t('cohortes.status.ARCHIVED'), value: 'ARCHIVED' },
];

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') {
    return 'bg-success-bg text-success-fg';
  }
  if (status === 'COMPLETED') {
    return 'bg-info-bg text-info-fg';
  }
  if (status === 'ARCHIVED') {
    return 'bg-muted text-text-subtle';
  }
  return 'bg-warning-bg text-warning-fg';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const totalPages = computed(() => Math.ceil(total.value / pageSize));
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10">
    <!-- En-tête -->
    <div class="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('cohortes.title') }}
        </h1>
        <p v-if="total > 0" class="mt-1 text-sm text-text-muted">
          {{ total }} cohorte{{ total > 1 ? 's' : '' }}
        </p>
      </div>
      <UButton v-if="canManageCohorte()" to="/cohortes/new" icon="i-tabler-plus" color="primary">
        {{ t('cohortes.new') }}
      </UButton>
    </div>

    <!-- Onglets statut -->
    <div
      role="tablist"
      :aria-label="t('cohortes.filter.byStatus')"
      class="mb-6 flex flex-wrap gap-1 rounded-lg border border-border-subtle bg-surface p-1"
    >
      <button
        v-for="tab in statusTabs"
        :key="String(tab.value)"
        role="tab"
        :aria-selected="statusFilter === tab.value"
        :tabindex="statusFilter === tab.value ? 0 : -1"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          statusFilter === tab.value
            ? 'bg-accent text-text-on-accent'
            : 'text-text-muted hover:bg-muted hover:text-text-default'
        "
        @click="statusFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="space-y-4">
      <div v-for="n in 4" :key="n" class="skeleton h-28 rounded-lg" />
    </div>

    <!-- État vide -->
    <div
      v-else-if="cohortes.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface py-20 text-center"
    >
      <UIcon name="i-tabler-users-group" class="mb-4 size-12 text-text-subtle" />
      <p class="text-base font-medium text-text-strong">{{ t('cohortes.noResults') }}</p>
      <UButton
        v-if="canManageCohorte()"
        to="/cohortes/new"
        icon="i-tabler-plus"
        color="primary"
        variant="soft"
        class="mt-4"
      >
        {{ t('cohortes.new') }}
      </UButton>
    </div>

    <!-- Liste des cohortes -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="item in cohortes"
        :key="item.id"
        :to="`/cohortes/${item.id}`"
        class="block rounded-lg border border-border-subtle bg-surface p-5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-semibold text-text-strong">{{ item.name }}</h2>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusBadgeClass(item.status)"
              >
                {{ t(`cohortes.status.${item.status}`) }}
              </span>
            </div>
            <p class="mt-1 text-sm text-text-muted">
              {{ item.cursusVersion.cursus.title }}
            </p>
            <div class="mt-2 flex flex-wrap gap-3 text-sm text-text-muted">
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-calendar" class="size-4 shrink-0" />
                {{ formatDate(item.startDate) }} → {{ formatDate(item.endDate) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-users" class="size-4 shrink-0" />
                {{ item._count.memberships }} membre{{ item._count.memberships !== 1 ? 's' : '' }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-repeat" class="size-4 shrink-0" />
                {{ t(`cohortes.rhythmLabel.${item.rhythm}`) }}
              </span>
            </div>
          </div>
          <UIcon name="i-tabler-chevron-right" class="mt-1 size-5 shrink-0 text-text-subtle" />
        </div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-8 flex justify-center">
      <UPagination v-model:page="currentPage" :total="total" :page-size="pageSize" />
    </div>
  </div>
</template>
