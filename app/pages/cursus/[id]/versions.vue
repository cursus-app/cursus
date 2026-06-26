<script setup lang="ts">
/**
 * Page /cursus/:id/versions — historique et diff de versions (ST-03.5).
 */
import { diffCursusVersions } from '~/utils/cursusDiff';
import type { CursusDiff, ModuleDiff } from '~/utils/cursusDiff';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();
const toast = useToast();
const route = useRoute();

const cursusId = computed(() => {
  const raw = route.params['id'];
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
});

// ─── Versions list ────────────────────────────────────────────────────────────

interface VersionSummary {
  id: string;
  version: number;
  publishedAt: string;
  moduleCount: number;
}

const versions = ref<VersionSummary[]>([]);
const isLoadingVersions = ref(true);

async function loadVersions() {
  isLoadingVersions.value = true;
  try {
    versions.value = await $fetch<VersionSummary[]>(`/api/cursus/${cursusId.value}/versions`);
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isLoadingVersions.value = false;
  }
}

onMounted(() => {
  void loadVersions();
});

// ─── Diff ─────────────────────────────────────────────────────────────────────

const selectedV1Id = ref<string>('');
const selectedV2Id = ref<string>('');
const isLoadingDiff = ref(false);
const diff = ref<CursusDiff | null>(null);

const versionOptions = computed(() =>
  versions.value.map((v) => ({
    label: `v${v.version} — ${new Date(v.publishedAt).toLocaleDateString()}`,
    value: v.id,
  })),
);

async function computeDiff() {
  if (!selectedV1Id.value || !selectedV2Id.value) {
    return;
  }

  if (selectedV1Id.value === selectedV2Id.value) {
    diff.value = null;
    return;
  }

  isLoadingDiff.value = true;
  diff.value = null;

  try {
    const [snap1, snap2] = await Promise.all([
      $fetch<{ snapshotJson: unknown }>(
        `/api/cursus/${cursusId.value}/versions/${selectedV1Id.value}`,
      ),
      $fetch<{ snapshotJson: unknown }>(
        `/api/cursus/${cursusId.value}/versions/${selectedV2Id.value}`,
      ),
    ]);

    diff.value = diffCursusVersions(snap1.snapshotJson, snap2.snapshotJson);
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isLoadingDiff.value = false;
  }
}

watch([selectedV1Id, selectedV2Id], () => {
  void computeDiff();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function moduleChangeClass(change: ModuleDiff['change']): string {
  if (change === 'added') {
    return 'bg-success-bg text-success-fg';
  }
  if (change === 'removed') {
    return 'bg-danger-bg text-danger-fg';
  }
  if (change === 'modified') {
    return 'bg-warning-bg text-warning-fg';
  }
  return 'text-text-muted';
}

function moduleChangeIcon(change: ModuleDiff['change']): string {
  if (change === 'added') {
    return 'i-tabler-plus';
  }
  if (change === 'removed') {
    return 'i-tabler-minus';
  }
  if (change === 'modified') {
    return 'i-tabler-pencil';
  }
  return 'i-tabler-minus';
}

function moduleChangeSymbol(change: ModuleDiff['change']): string {
  if (change === 'added') {
    return '+';
  }
  if (change === 'removed') {
    return '−';
  }
  if (change === 'modified') {
    return '~';
  }
  return '·';
}

function moduleChangeLabel(change: ModuleDiff['change']): string {
  if (change === 'added') {
    return t('cursus.versions.diff.added');
  }
  if (change === 'removed') {
    return t('cursus.versions.diff.removed');
  }
  if (change === 'modified') {
    return t('cursus.versions.diff.modified');
  }
  return t('cursus.versions.diff.unchanged');
}

const hasMetaChanges = computed(
  () => diff.value?.titleChanged || diff.value?.descriptionChanged || diff.value?.durationChanged,
);

const hasDiff = computed(
  () =>
    diff.value !== null &&
    (diff.value.modulesAdded > 0 ||
      diff.value.modulesRemoved > 0 ||
      diff.value.modulesModified > 0 ||
      hasMetaChanges.value),
);

useSeoMeta({ title: `${t('cursus.versions.title')} — Cursus` });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <!-- Fil d'Ariane -->
    <UBreadcrumb
      :items="[
        { label: t('cursus.title'), to: '/cursus' },
        { label: '…', to: `/cursus/${cursusId}` },
        { label: t('cursus.versions.title') },
      ]"
      class="mb-6"
    />

    <h1 class="mb-6 text-2xl font-semibold tracking-tight text-text-strong">
      {{ t('cursus.versions.title') }}
    </h1>

    <!-- Skeleton chargement -->
    <div v-if="isLoadingVersions" class="space-y-3">
      <div class="skeleton h-12 rounded-lg" />
      <div class="skeleton h-12 rounded-lg" />
      <div class="skeleton h-12 rounded-lg" />
    </div>

    <template v-else>
      <!-- Table des versions -->
      <UCard class="mb-8 border border-border-subtle bg-surface">
        <template #header>
          <h2 class="text-sm font-medium text-text-strong">
            {{ t('cursus.versions.title') }}
          </h2>
        </template>

        <div v-if="versions.length === 0" class="py-6 text-center text-sm text-text-muted">
          {{ t('cursus.noResults') }}
        </div>

        <ul v-else role="list" class="divide-y divide-border-subtle">
          <li v-for="v in versions" :key="v.id" class="flex items-center gap-4 px-1 py-3">
            <!-- Numéro de version -->
            <span
              class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle font-mono text-sm font-semibold text-accent-text"
              :aria-label="`${t('cursus.versions.version')} ${v.version}`"
            >
              {{ v.version }}
            </span>

            <!-- Date et module count -->
            <div class="min-w-0 flex-1">
              <p class="text-sm text-text-default">
                {{ t('cursus.versions.publishedAt') }}
                {{ new Date(v.publishedAt).toLocaleDateString() }}
              </p>
              <p class="mt-0.5 text-xs text-text-muted">
                {{ v.moduleCount }}
                {{ t('cursus.versions.moduleCount') }}
              </p>
            </div>

            <!-- Bouton voir snapshot -->
            <UButton
              :to="`/api/cursus/${cursusId}/versions/${v.id}`"
              target="_blank"
              icon="i-tabler-eye"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('cursus.versions.viewSnapshot')"
            >
              {{ t('cursus.versions.viewSnapshot') }}
            </UButton>
          </li>
        </ul>
      </UCard>

      <!-- Comparateur de versions -->
      <UCard v-if="versions.length >= 2" class="mb-6 border border-border-subtle bg-surface">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-tabler-git-diff" class="size-4 text-text-muted" />
            <h2 class="text-sm font-medium text-text-strong">
              {{ t('cursus.versions.compareVersions') }}
            </h2>
          </div>
        </template>

        <!-- Sélecteurs -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-text-muted">
              {{ t('cursus.versions.v1') }}
            </label>
            <USelect
              v-model="selectedV1Id"
              :items="versionOptions"
              value-key="value"
              :placeholder="t('cursus.versions.selectVersion')"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium text-text-muted">
              {{ t('cursus.versions.v2') }}
            </label>
            <USelect
              v-model="selectedV2Id"
              :items="versionOptions"
              value-key="value"
              :placeholder="t('cursus.versions.selectVersion')"
            />
          </div>
        </div>

        <!-- Résultat du diff -->
        <div v-if="isLoadingDiff" class="mt-6 space-y-2">
          <div class="skeleton h-10 rounded" />
          <div class="skeleton h-10 rounded" />
        </div>

        <template v-else-if="diff !== null && selectedV1Id && selectedV2Id">
          <!-- Résumé des changements metadata -->
          <div v-if="hasMetaChanges" class="mt-6 space-y-2">
            <p
              v-if="diff.titleChanged"
              class="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-fg"
            >
              <UIcon name="i-tabler-pencil" class="size-4 shrink-0" aria-hidden="true" />
              <span aria-label="modifié">~</span>
              <span>{{ t('cursus.fields.title') }}</span>
            </p>
            <p
              v-if="diff.descriptionChanged"
              class="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-fg"
            >
              <UIcon name="i-tabler-pencil" class="size-4 shrink-0" aria-hidden="true" />
              <span aria-label="modifié">~</span>
              <span>{{ t('cursus.fields.description') }}</span>
            </p>
            <p
              v-if="diff.durationChanged"
              class="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-fg"
            >
              <UIcon name="i-tabler-pencil" class="size-4 shrink-0" aria-hidden="true" />
              <span aria-label="modifié">~</span>
              <span>{{ t('cursus.fields.durationWeeks') }}</span>
            </p>
          </div>

          <!-- Résumé modules -->
          <div class="mt-4 flex flex-wrap gap-3">
            <span
              v-if="diff.modulesAdded > 0"
              class="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-fg"
            >
              <UIcon name="i-tabler-plus" class="size-3" aria-hidden="true" />
              {{ t('cursus.versions.diff.modulesAdded', { n: diff.modulesAdded }) }}
            </span>
            <span
              v-if="diff.modulesRemoved > 0"
              class="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-medium text-danger-fg"
            >
              <UIcon name="i-tabler-minus" class="size-3" aria-hidden="true" />
              {{ t('cursus.versions.diff.modulesRemoved', { n: diff.modulesRemoved }) }}
            </span>
            <span
              v-if="diff.modulesModified > 0"
              class="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-fg"
            >
              <UIcon name="i-tabler-pencil" class="size-3" aria-hidden="true" />
              {{ t('cursus.versions.diff.modulesModified', { n: diff.modulesModified }) }}
            </span>
          </div>

          <!-- Liste des modules avec diff -->
          <ul
            v-if="diff.modules.length > 0"
            role="list"
            class="mt-4 space-y-1.5"
            :aria-label="t('cursus.versions.compareVersions')"
          >
            <li
              v-for="mod in diff.modules"
              :key="mod.id"
              class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm"
              :class="[
                mod.change !== 'unchanged' ? moduleChangeClass(mod.change) : 'text-text-muted',
              ]"
            >
              <!-- Symbole (a11y couleurs) -->
              <span
                class="shrink-0 font-mono text-base font-bold"
                :aria-label="moduleChangeLabel(mod.change)"
              >
                {{ moduleChangeSymbol(mod.change) }}
              </span>

              <!-- Icône (visuels) -->
              <UIcon
                v-if="mod.change !== 'unchanged'"
                :name="moduleChangeIcon(mod.change)"
                class="size-4 shrink-0"
                aria-hidden="true"
              />

              <!-- Titre et semaine -->
              <span class="min-w-0 flex-1 truncate">
                <span class="font-medium">{{ mod.title }}</span>
                <span class="ml-2 opacity-70">— S{{ mod.week }}</span>
              </span>

              <!-- Champs modifiés -->
              <span
                v-if="mod.change === 'modified' && mod.fields?.length"
                class="shrink-0 text-xs opacity-75"
              >
                ({{ mod.fields.join(', ') }})
              </span>
            </li>
          </ul>

          <!-- Aucun changement -->
          <p v-if="!hasDiff" class="mt-4 text-sm text-text-muted">
            {{ t('cursus.versions.diff.noChanges') }}
          </p>
        </template>
      </UCard>

      <!-- Lien retour -->
      <div class="mt-4">
        <UButton
          :to="`/cursus/${cursusId}`"
          icon="i-tabler-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
        >
          {{ t('common.back') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
