<script setup lang="ts">
/**
 * Page /cursus — liste des cursus avec filtres et pagination.
 * Cf. ST-03.1 — TT-03.1.5.
 */
import type { CursusListItem } from '~/composables/useCursus';
import type { ListCursusQuery } from '~~/shared/schemas/cursus';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Cursus — Cursus' });

const { t } = useI18n();
const toast = useToast();
const { canManageCursus } = usePermission();
const { listCursus, loading } = useCursus();

// ─── État des filtres ─────────────────────────────────────────────────────────

const statusFilter = ref<'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined>(undefined);
const domainFilter = ref<string | undefined>(undefined);
const levelFilter = ref<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | undefined>(undefined);
const currentPage = ref(1);
const pageSize = 20;

// ─── Données ──────────────────────────────────────────────────────────────────

const total = ref(0);
const cursus = ref<CursusListItem[]>([]);

async function fetchCursus() {
  try {
    const result = await listCursus({
      status: statusFilter.value,
      domain: domainFilter.value as ListCursusQuery['domain'],
      level: levelFilter.value,
      page: currentPage.value,
      limit: pageSize,
    });
    cursus.value = result.data;
    total.value = result.total;
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

watch([statusFilter, domainFilter, levelFilter], () => {
  currentPage.value = 1;
  void fetchCursus();
});

watch(currentPage, () => {
  void fetchCursus();
});

onMounted(() => {
  void fetchCursus();
});

// ─── Options pour les sélecteurs ─────────────────────────────────────────────

const statusTabs = [
  { label: t('cursus.filter.all'), value: undefined },
  { label: t('cursus.draft'), value: 'DRAFT' as const },
  { label: t('cursus.published'), value: 'PUBLISHED' as const },
  { label: t('cursus.archived'), value: 'ARCHIVED' as const },
];

const domainOptions = [
  { label: t('cursus.filter.all'), value: '' },
  { label: t('cursus.domain.dev-web'), value: 'dev-web' },
  { label: t('cursus.domain.ingenierie-web'), value: 'ingenierie-web' },
  { label: t('cursus.domain.ia'), value: 'ia' },
  { label: t('cursus.domain.cybersec'), value: 'cybersec' },
  { label: t('cursus.domain.autre'), value: 'autre' },
];

const levelOptions = [
  { label: t('cursus.filter.all'), value: '' },
  { label: t('cursus.level.BEGINNER'), value: 'BEGINNER' },
  { label: t('cursus.level.INTERMEDIATE'), value: 'INTERMEDIATE' },
  { label: t('cursus.level.ADVANCED'), value: 'ADVANCED' },
];

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === 'PUBLISHED') {
    return 'bg-success-bg text-success-fg';
  }
  if (status === 'ARCHIVED') {
    return 'bg-danger-bg text-danger-fg';
  }
  return 'bg-muted text-text-muted';
}

function statusLabel(status: string): string {
  if (status === 'PUBLISHED') {
    return t('cursus.published');
  }
  if (status === 'ARCHIVED') {
    return t('cursus.archived');
  }
  return t('cursus.draft');
}

function levelLabel(level: string): string {
  if (level === 'BEGINNER') {
    return t('cursus.level.BEGINNER');
  }
  if (level === 'INTERMEDIATE') {
    return t('cursus.level.INTERMEDIATE');
  }
  return t('cursus.level.ADVANCED');
}

function domainLabel(domain: string): string {
  const key = `cursus.domain.${domain}` as const;
  return t(key as Parameters<typeof t>[0]) || domain;
}

const totalPages = computed(() => Math.ceil(total.value / pageSize));
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10">
    <!-- En-tête -->
    <div class="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('cursus.title') }}
        </h1>
        <p v-if="total > 0" class="mt-1 text-sm text-text-muted">{{ total }} cursus</p>
      </div>
      <UButton v-if="canManageCursus()" to="/cursus/new" icon="i-tabler-plus" color="primary">
        {{ t('cursus.new') }}
      </UButton>
    </div>

    <!-- Filtres -->
    <div class="mb-6 space-y-4">
      <!-- Onglets statut -->
      <div
        role="tablist"
        :aria-label="t('cursus.filter.byStatus')"
        class="flex gap-1 rounded-lg border border-border-subtle bg-surface p-1"
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

      <!-- Sélecteurs domaine + niveau -->
      <div class="flex flex-wrap gap-3">
        <USelect
          :model-value="domainFilter ?? ''"
          :options="domainOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('cursus.filter.byDomain')"
          class="min-w-[180px]"
          @update:model-value="
            (v: string) => {
              domainFilter = v || undefined;
            }
          "
        />
        <USelect
          :model-value="levelFilter ?? ''"
          :options="levelOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('cursus.filter.byLevel')"
          class="min-w-[160px]"
          @update:model-value="
            (v: string) => {
              levelFilter = v ? (v as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') : undefined;
            }
          "
        />
      </div>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="space-y-4">
      <div v-for="n in 4" :key="n" class="skeleton h-32 rounded-lg" />
    </div>

    <!-- État vide -->
    <div
      v-else-if="cursus.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface py-20 text-center"
    >
      <UIcon name="i-tabler-books" class="mb-4 size-12 text-text-subtle" />
      <p class="text-base font-medium text-text-strong">{{ t('cursus.noResults') }}</p>
      <UButton
        v-if="canManageCursus()"
        to="/cursus/new"
        icon="i-tabler-plus"
        color="primary"
        variant="soft"
        class="mt-4"
      >
        {{ t('cursus.new') }}
      </UButton>
    </div>

    <!-- Liste des cursus -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="item in cursus"
        :key="item.id"
        :to="`/cursus/${item.id}`"
        class="block rounded-lg border border-border-subtle bg-surface p-5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-semibold text-text-strong">{{ item.title }}</h2>
              <!-- Badge statut -->
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusBadgeClass(item.status)"
              >
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-3 text-sm text-text-muted">
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-category" class="size-4 shrink-0" />
                {{ domainLabel(item.domain) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-chart-bar" class="size-4 shrink-0" />
                {{ levelLabel(item.level) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-clock" class="size-4 shrink-0" />
                {{ item.durationWeeks }}
                sem.
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-tabler-stack" class="size-4 shrink-0" />
                {{ t('cursus.modules.count', { n: item._count.modules }) }}
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
