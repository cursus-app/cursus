<script setup lang="ts">
/**
 * Page /cursus/:id/preview — prévisualisation stagiaire (read-only).
 * Cf. ST-03.8 — TT-03.8.1 à TT-03.8.4.
 *
 * - Bandeau de mode aperçu sticky (TT-03.8.3).
 * - Sélecteur de semaine simulée (TT-03.8.4).
 * - Affichage read-only des modules : titre, objectifs, ressources, livrable (TT-03.8.2).
 * - Boutons désactivés avec aria-disabled + tooltip (a11y).
 * - Aucune écriture en DB : endpoint GET uniquement.
 */

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface Resource {
  title: string;
  url: string;
  type?: string;
}

interface DeliverableSpec {
  title: string;
  description?: string;
  mandatory?: boolean;
  githubRequired?: boolean;
}

interface PreviewModule {
  id: string;
  week: number;
  title: string;
  objectives: string;
  resourcesJson: unknown;
  deliverableSpecJson: unknown;
  xpReward: number;
}

interface CursusPreview {
  id: string;
  title: string;
  slug: string;
  domain: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationWeeks: number;
  description: string | null;
  prerequisites: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  modules: PreviewModule[];
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { canManageCursus } = usePermission();
const userStore = useUserStore();

const cursusId = computed(() => {
  const rawId = route.params['id'];
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
});

useSeoMeta({ title: t('cursus.preview.pageTitle', { title: '…' }), robots: 'noindex' });

// ─── Données ──────────────────────────────────────────────────────────────────

const cursus = ref<CursusPreview | null>(null);
const isLoadingPage = ref(true);

async function loadPreview() {
  isLoadingPage.value = true;
  try {
    const data = await $fetch<CursusPreview>(`/api/cursus/${cursusId.value}/preview`);
    cursus.value = data;
    useSeoMeta({
      title: t('cursus.preview.pageTitle', { title: data.title }),
      robots: 'noindex',
    });

    // Vérification des droits côté client (la vérité reste côté serveur)
    const isOwnerOrAdmin =
      userStore.userId === data.id || userStore.globalRole === 'ADMIN' || canManageCursus();

    if (!isOwnerOrAdmin) {
      await navigateTo(`/cursus/${cursusId.value}`);
      return;
    }
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    if (fetchErr.statusCode === 404) {
      await navigateTo('/cursus');
    } else if (fetchErr.statusCode === 403 || fetchErr.statusCode === 401) {
      await navigateTo(`/cursus/${cursusId.value}`);
    } else {
      toast.add({
        title: t('errors.generic'),
        color: 'error',
        icon: 'i-tabler-circle-x',
      });
    }
  } finally {
    isLoadingPage.value = false;
  }
}

onMounted(() => {
  void loadPreview();
});

// ─── Sélecteur de semaine ────────────────────────────────────────────────────

/**
 * Semaine sélectionnée : priorité au query param `?week=N`, sinon 1.
 * On contraint dans [1, max available week] après chargement.
 */
const selectedWeek = ref<number>(1);

watch(
  () => route.query['week'],
  (raw) => {
    const parsed = parseInt(String(raw ?? '1'), 10);
    selectedWeek.value = isNaN(parsed) || parsed < 1 ? 1 : parsed;
  },
  { immediate: true },
);

const weekOptions = computed<{ label: string; value: number }[]>(() => {
  if (!cursus.value || cursus.value.modules.length === 0) {
    return [];
  }
  return cursus.value.modules.map((m) => ({
    label: t('cursus.preview.week', { n: m.week }),
    value: m.week,
  }));
});

function selectWeek(week: number) {
  selectedWeek.value = week;
  void navigateTo({ query: { week } });
}

// ─── Module courant ──────────────────────────────────────────────────────────

const currentModule = computed<PreviewModule | null>(() => {
  if (!cursus.value || cursus.value.modules.length === 0) {
    return null;
  }
  return (
    cursus.value.modules.find((m) => m.week === selectedWeek.value) ?? null
  );
});

const hasPreviousWeek = computed(() => {
  if (!cursus.value || cursus.value.modules.length === 0) {
    return false;
  }
  const weeks = cursus.value.modules.map((m) => m.week);
  const idx = weeks.indexOf(selectedWeek.value);
  return idx > 0;
});

const hasNextWeek = computed(() => {
  if (!cursus.value || cursus.value.modules.length === 0) {
    return false;
  }
  const weeks = cursus.value.modules.map((m) => m.week);
  const idx = weeks.indexOf(selectedWeek.value);
  return idx >= 0 && idx < weeks.length - 1;
});

function goToPreviousWeek() {
  if (!cursus.value) {
    return;
  }
  const weeks = cursus.value.modules.map((m) => m.week).sort((a, b) => a - b);
  const idx = weeks.indexOf(selectedWeek.value);
  const prevWeek = idx > 0 ? weeks[idx - 1] : undefined;
  if (prevWeek !== undefined) {
    selectWeek(prevWeek);
  }
}

function goToNextWeek() {
  if (!cursus.value) {
    return;
  }
  const weeks = cursus.value.modules.map((m) => m.week).sort((a, b) => a - b);
  const idx = weeks.indexOf(selectedWeek.value);
  const nextWeek = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : undefined;
  if (nextWeek !== undefined) {
    selectWeek(nextWeek);
  }
}

// ─── Helpers JSON ────────────────────────────────────────────────────────────

function getResources(mod: PreviewModule): Resource[] {
  if (!Array.isArray(mod.resourcesJson)) {
    return [];
  }
  return (mod.resourcesJson as unknown[]).filter(
    (r): r is Resource =>
      typeof r === 'object' && r !== null && 'title' in r && 'url' in r,
  );
}

function getDeliverable(mod: PreviewModule): DeliverableSpec | null {
  const spec = mod.deliverableSpecJson;
  if (typeof spec !== 'object' || spec === null || !('title' in spec)) {
    return null;
  }
  return spec as DeliverableSpec;
}

/** Ressources du module courant (tableau vide si aucun module sélectionné). */
const currentResources = computed<Resource[]>(() =>
  currentModule.value ? getResources(currentModule.value) : [],
);

/** Livrable du module courant ou null. */
const currentDeliverable = computed<DeliverableSpec | null>(() =>
  currentModule.value ? getDeliverable(currentModule.value) : null,
);

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

function levelLabel(level: string): string {
  if (level === 'BEGINNER') {
    return t('cursus.level.BEGINNER');
  }
  if (level === 'INTERMEDIATE') {
    return t('cursus.level.INTERMEDIATE');
  }
  return t('cursus.level.ADVANCED');
}

function tDynamic(key: string): string {
  return t(key as Parameters<typeof t>[0]);
}

function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '#';
  } catch {
    return '#';
  }
}
</script>

<template>
  <div class="min-h-screen bg-app">
    <!-- ─── Bandeau mode aperçu (sticky, a11y: role=alert) ─────────────────── -->
    <div
      role="alert"
      aria-live="polite"
      class="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-warning-solid/30 bg-warning-bg px-4 py-2.5"
    >
      <div class="flex items-center gap-2 text-sm font-medium text-warning-fg">
        <UIcon name="i-tabler-eye" class="size-4 shrink-0" aria-hidden="true" />
        {{ t('cursus.preview.banner') }}
      </div>
      <UButton
        :to="`/cursus/${cursusId}`"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-tabler-arrow-left"
        class="text-warning-fg hover:bg-warning-solid/10"
      >
        {{ t('cursus.preview.backToEditor') }}
      </UButton>
    </div>

    <div class="mx-auto max-w-3xl px-4 py-8">
      <!-- Skeleton chargement -->
      <div v-if="isLoadingPage" class="space-y-6">
        <div class="skeleton h-10 w-3/4 rounded-lg" />
        <div class="skeleton h-48 rounded-lg" />
        <div class="skeleton h-64 rounded-lg" />
      </div>

      <template v-else-if="cursus">
        <!-- ─── En-tête cursus ────────────────────────────────────────────── -->
        <div class="mb-6">
          <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
            {{ cursus.title }}
          </h1>
          <p class="mt-1 text-sm text-text-muted">
            {{ tDynamic(`cursus.domain.${cursus.domain}`) }} ·
            {{ levelLabel(cursus.level) }} ·
            {{ cursus.durationWeeks }} sem.
          </p>
        </div>

        <!-- Description + prérequis -->
        <UCard
          v-if="cursus.description || cursus.prerequisites"
          class="mb-6 border border-border-subtle bg-surface"
        >
          <div v-if="cursus.description">
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cursus.fields.description') }}
            </p>
            <p class="mt-1 text-sm whitespace-pre-wrap text-text-default">
              {{ cursus.description }}
            </p>
          </div>
          <div v-if="cursus.prerequisites" :class="cursus.description ? 'mt-4 border-t border-border-subtle pt-4' : ''">
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cursus.fields.prerequisites') }}
            </p>
            <p class="mt-1 text-sm whitespace-pre-wrap text-text-default">
              {{ cursus.prerequisites }}
            </p>
          </div>
        </UCard>

        <!-- ─── État vide : aucun module ─────────────────────────────────── -->
        <div
          v-if="cursus.modules.length === 0"
          class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface py-16 text-center"
        >
          <UIcon name="i-tabler-stack-2" class="mb-3 size-10 text-text-subtle" aria-hidden="true" />
          <p class="text-sm text-text-muted">{{ t('cursus.preview.noModules') }}</p>
        </div>

        <template v-else>
          <!-- ─── Sélecteur de semaine ─────────────────────────────────── -->
          <div class="mb-6 flex items-center gap-3">
            <span class="text-sm font-medium text-text-default">
              {{ t('cursus.preview.weekSelector') }} :
            </span>
            <div class="flex items-center gap-1.5">
              <UButton
                icon="i-tabler-chevron-left"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="!hasPreviousWeek"
                :aria-disabled="!hasPreviousWeek"
                :aria-label="t('common.previous')"
                @click="goToPreviousWeek"
              />
              <USelect
                :model-value="selectedWeek"
                :options="weekOptions"
                option-attribute="label"
                value-attribute="value"
                size="sm"
                class="w-44"
                :aria-label="t('cursus.preview.weekSelector')"
                @update:model-value="selectWeek($event as number)"
              />
              <UButton
                icon="i-tabler-chevron-right"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="!hasNextWeek"
                :aria-disabled="!hasNextWeek"
                :aria-label="t('common.next')"
                @click="goToNextWeek"
              />
            </div>
          </div>

          <!-- ─── Module courant ────────────────────────────────────────── -->
          <div v-if="currentModule" class="space-y-4" data-testid="module-content">
            <!-- En-tête module -->
            <UCard class="border border-border-subtle bg-surface">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
                    {{ t('cursus.preview.week', { n: currentModule.week }) }}
                  </p>
                  <h2 class="mt-1 text-lg font-semibold text-text-strong">
                    {{ currentModule.title }}
                  </h2>
                </div>
                <span class="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-text">
                  {{ t('cursus.preview.xpReward', { n: currentModule.xpReward }) }}
                </span>
              </div>
            </UCard>

            <!-- Objectifs -->
            <UCard class="border border-border-subtle bg-surface">
              <template #header>
                <h3 class="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <UIcon name="i-tabler-target" class="size-4 text-accent-text" aria-hidden="true" />
                  {{ t('cursus.preview.objectives') }}
                </h3>
              </template>
              <p class="text-sm whitespace-pre-wrap text-text-default">
                {{ currentModule.objectives }}
              </p>
            </UCard>

            <!-- Ressources -->
            <UCard class="border border-border-subtle bg-surface">
              <template #header>
                <h3 class="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <UIcon name="i-tabler-books" class="size-4 text-accent-text" aria-hidden="true" />
                  {{ t('cursus.preview.resources') }}
                </h3>
              </template>

              <ul
                v-if="currentResources.length > 0"
                class="space-y-2"
                data-testid="resources-list"
              >
                <li
                  v-for="resource in currentResources"
                  :key="resource.url"
                  class="flex items-center gap-2 text-sm"
                >
                  <UIcon
                    name="i-tabler-link"
                    class="size-4 shrink-0 text-text-subtle"
                    aria-hidden="true"
                  />
                  <a
                    :href="safeHref(resource.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-accent-text underline-offset-2 hover:underline"
                  >
                    {{ resource.title }}
                  </a>
                </li>
              </ul>
              <p v-else class="text-sm text-text-muted">
                {{ t('cursus.preview.noResources') }}
              </p>
            </UCard>

            <!-- Livrable -->
            <UCard
              v-if="currentDeliverable"
              class="border border-border-subtle bg-surface"
            >
              <template #header>
                <h3 class="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <UIcon name="i-tabler-upload" class="size-4 text-accent-text" aria-hidden="true" />
                  {{ t('cursus.preview.deliverable') }}
                </h3>
              </template>

              <div class="space-y-3">
                <div>
                  <p class="text-sm font-medium text-text-default">
                    {{ currentDeliverable.title }}
                  </p>
                  <p
                    v-if="currentDeliverable.description"
                    class="mt-1 text-sm text-text-muted"
                  >
                    {{ currentDeliverable.description }}
                  </p>
                </div>

                <!-- Bouton soumettre désactivé en mode aperçu -->
                <UTooltip :text="t('cursus.preview.submitDisabled')">
                  <UButton
                    icon="i-tabler-upload"
                    color="primary"
                    disabled
                    aria-disabled="true"
                    :aria-label="t('cursus.preview.submitLabel')"
                    data-testid="submit-disabled"
                  >
                    {{ t('cursus.preview.submitLabel') }}
                  </UButton>
                </UTooltip>
              </div>
            </UCard>
          </div>

          <!-- Semaine sans module correspondant -->
          <div
            v-else
            class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface py-16 text-center"
            data-testid="no-module-for-week"
          >
            <UIcon name="i-tabler-calendar-off" class="mb-3 size-10 text-text-subtle" aria-hidden="true" />
            <p class="text-sm text-text-muted">
              {{ t('cursus.preview.noModuleForWeek', { n: selectedWeek }) }}
            </p>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
