<script setup lang="ts">
/**
 * ImportRoadmapModal — modale d'import depuis roadmap.sh.
 *
 * Deux modes :
 *  - Sélection depuis le catalogue intégré (frontend, backend, devops…)
 *  - Collage de JSON personnalisé
 *
 * Affiche un aperçu (nombre de modules) avant confirmation.
 * Cf. ST-03.7 — TT-03.7.4.
 */
import { z } from 'zod';
import type { RoadmapCatalogEntry, ImportRoadmapResult } from '~/composables/useCursus';
import type { ImportRoadmapInput, RoadmapConcept } from '~~/shared/schemas/cursus';
import { roadmapConceptSchema } from '~~/shared/schemas/cursus';

// ─── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  cursusId: string;
  hasExistingModules: boolean;
}>();

const emit = defineEmits<{
  imported: [result: ImportRoadmapResult];
}>();

// ─── State ────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const toast = useToast();
const { getRoadmapCatalog, importRoadmap, loading } = useCursus();

const isOpen = ref(false);

/** Step: 'select' → 'preview' → done */
type Step = 'select' | 'preview';
const step = ref<Step>('select');

/** Mode: catalogue or custom JSON */
type InputMode = 'catalog' | 'custom';
const inputMode = ref<InputMode>('catalog');

// Catalog state
const catalog = ref<RoadmapCatalogEntry[]>([]);
const catalogLoading = ref(false);
const catalogError = ref<string | null>(null);
const selectedRoadmapId = ref<string | null>(null);
const categoryFilter = ref<string>('all');

// Custom JSON state
const customJson = ref('');
const jsonParseError = ref<string | null>(null);
// Utilise le type Zod inféré (url?: string — optional property) pour être
// compatible avec exactOptionalPropertyTypes et ImportRoadmapInput.
const parsedConcepts = ref<RoadmapConcept[]>([]);

// Mode (replace/append)
const importMode = ref<'replace' | 'append'>('replace');

// Preview state
const previewInfo = ref<{ conceptCount: number; title: string } | null>(null);

// ─── Computed ─────────────────────────────────────────────────────────────────

const categories = computed(() => {
  const cats = new Set(catalog.value.map((r) => r.category));
  return ['all', ...Array.from(cats)];
});

const filteredCatalog = computed(() => {
  if (categoryFilter.value === 'all') {
    return catalog.value;
  }
  return catalog.value.filter((r) => r.category === categoryFilter.value);
});

const selectedEntry = computed(() =>
  catalog.value.find((r) => r.id === selectedRoadmapId.value),
);

const canProceed = computed(() => {
  if (inputMode.value === 'catalog') {
    return selectedRoadmapId.value !== null;
  }
  return parsedConcepts.value.length > 0 && jsonParseError.value === null;
});

const categoryLabel = (cat: string): string => {
  const labels: Record<string, string> = {
    all: t('cursus.importRoadmap.categories.all'),
    frontend: t('cursus.importRoadmap.categories.frontend'),
    backend: t('cursus.importRoadmap.categories.backend'),
    devops: t('cursus.importRoadmap.categories.devops'),
    security: t('cursus.importRoadmap.categories.security'),
    ai: t('cursus.importRoadmap.categories.ai'),
    language: t('cursus.importRoadmap.categories.language'),
    tool: t('cursus.importRoadmap.categories.tool'),
  };
  return labels[cat] ?? cat;
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    catalog.value = await getRoadmapCatalog();
  } catch {
    catalogError.value = t('cursus.importRoadmap.errors.catalogUnavailable');
  } finally {
    catalogLoading.value = false;
  }
}

function open() {
  step.value = 'select';
  inputMode.value = 'catalog';
  selectedRoadmapId.value = null;
  customJson.value = '';
  jsonParseError.value = null;
  parsedConcepts.value = [];
  importMode.value = 'replace';
  previewInfo.value = null;
  categoryFilter.value = 'all';
  isOpen.value = true;
  void loadCatalog();
}

function close() {
  isOpen.value = false;
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

/**
 * Parse et valide le JSON collé par l'utilisateur.
 * Accepte :
 *  - Format CIF : { concepts: [{ title, url? }] }
 *  - Format simplifié : [{ title, url? }]
 */
function parseCustomJson() {
  jsonParseError.value = null;
  parsedConcepts.value = [];

  if (!customJson.value.trim()) {
    return;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(customJson.value);
  } catch {
    jsonParseError.value = t('cursus.importRoadmap.errors.invalidJson');
    return;
  }

  // Extraire la liste de concepts depuis les deux formats supportés.
  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (
    raw !== null &&
    typeof raw === 'object' &&
    'concepts' in raw &&
    Array.isArray((raw as { concepts: unknown }).concepts)
  ) {
    list = (raw as { concepts: unknown[] }).concepts;
  } else {
    jsonParseError.value = t('cursus.importRoadmap.errors.invalidJsonFormat');
    return;
  }

  const conceptListSchema = z.array(roadmapConceptSchema).min(1).max(200);
  const result = conceptListSchema.safeParse(list);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    jsonParseError.value = firstIssue?.message ?? t('cursus.importRoadmap.errors.invalidJsonFormat');
    return;
  }

  parsedConcepts.value = result.data;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function goToPreview() {
  if (!canProceed.value) { return; }

  if (inputMode.value === 'catalog' && selectedEntry.value) {
    previewInfo.value = {
      conceptCount: selectedEntry.value.conceptCount,
      title: selectedEntry.value.title,
    };
  } else {
    previewInfo.value = {
      conceptCount: parsedConcepts.value.length,
      title: t('cursus.importRoadmap.customRoadmap'),
    };
  }

  step.value = 'preview';
}

function goBack() {
  step.value = 'select';
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function handleImport() {
  const data: ImportRoadmapInput =
    inputMode.value === 'catalog'
      ? { roadmapId: selectedRoadmapId.value ?? undefined, mode: importMode.value }
      : { concepts: parsedConcepts.value, mode: importMode.value };

  try {
    const result = await importRoadmap(props.cursusId, data);
    toast.add({
      title: t('cursus.importRoadmap.success', { count: result.created }),
      color: 'success',
      icon: 'i-tabler-check',
    });
    emit('imported', result);
    close();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

// ─── Expose ───────────────────────────────────────────────────────────────────

defineExpose({ open });
</script>

<template>
  <UModal v-model:open="isOpen" class="sm:max-w-2xl">
    <template #content>
      <div class="flex flex-col" style="max-height: 80vh">
        <!-- Header -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4"
        >
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-accent">
              <UIcon name="i-tabler-git-merge" class="size-5 text-accent-text" />
            </div>
            <div>
              <h2 class="font-semibold text-text-strong">
                {{ t('cursus.importRoadmap.title') }}
              </h2>
              <p class="text-xs text-text-muted">
                {{ t('cursus.importRoadmap.subtitle') }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-tabler-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.close')"
            @click="close"
          />
        </div>

        <!-- Step: Select -->
        <div v-if="step === 'select'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <!-- Mode tabs -->
          <div class="flex shrink-0 gap-1 border-b border-border-subtle px-6 pt-4 pb-0">
            <button
              class="rounded-t-md px-4 py-2 text-sm font-medium transition-colors"
              :class="
                inputMode === 'catalog'
                  ? 'border-b-2 border-accent bg-accent/10 text-accent-text'
                  : 'text-text-muted hover:text-text-default'
              "
              @click="inputMode = 'catalog'"
            >
              <span class="flex items-center gap-1.5">
                <UIcon name="i-tabler-list" class="size-4" />
                {{ t('cursus.importRoadmap.tabs.catalog') }}
              </span>
            </button>
            <button
              class="rounded-t-md px-4 py-2 text-sm font-medium transition-colors"
              :class="
                inputMode === 'custom'
                  ? 'border-b-2 border-accent bg-accent/10 text-accent-text'
                  : 'text-text-muted hover:text-text-default'
              "
              @click="inputMode = 'custom'"
            >
              <span class="flex items-center gap-1.5">
                <UIcon name="i-tabler-code" class="size-4" />
                {{ t('cursus.importRoadmap.tabs.custom') }}
              </span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4">
            <!-- Catalog mode -->
            <template v-if="inputMode === 'catalog'">
              <!-- Loading -->
              <div v-if="catalogLoading" class="space-y-3">
                <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-lg bg-muted" />
              </div>

              <!-- Error -->
              <div
                v-else-if="catalogError"
                class="flex flex-col items-center gap-3 py-8 text-center"
              >
                <UIcon name="i-tabler-wifi-off" class="size-10 text-text-subtle" />
                <p class="text-sm text-text-muted">{{ catalogError }}</p>
                <UButton
                  icon="i-tabler-refresh"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="loadCatalog"
                >
                  {{ t('common.retry') }}
                </UButton>
              </div>

              <!-- Catalog list -->
              <template v-else>
                <!-- Category filter -->
                <div class="mb-4 flex flex-wrap gap-2" role="group" :aria-label="t('cursus.importRoadmap.filterByCategory')">
                  <button
                    v-for="cat in categories"
                    :key="cat"
                    class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    :class="
                      categoryFilter === cat
                        ? 'bg-accent text-accent-text'
                        : 'bg-muted text-text-muted hover:text-text-default'
                    "
                    @click="categoryFilter = cat"
                  >
                    {{ categoryLabel(cat) }}
                  </button>
                </div>

                <!-- Roadmap grid -->
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
                    v-for="entry in filteredCatalog"
                    :key="entry.id"
                    class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors"
                    :class="
                      selectedRoadmapId === entry.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border-subtle bg-surface hover:border-accent/50 hover:bg-muted'
                    "
                    :aria-pressed="selectedRoadmapId === entry.id"
                    @click="selectedRoadmapId = entry.id"
                  >
                    <UIcon
                      :name="
                        selectedRoadmapId === entry.id
                          ? 'i-tabler-circle-check-filled'
                          : 'i-tabler-circle'
                      "
                      class="mt-0.5 size-4 shrink-0"
                      :class="
                        selectedRoadmapId === entry.id ? 'text-accent-text' : 'text-text-subtle'
                      "
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-text-strong">
                        {{ entry.title }}
                      </p>
                      <p class="text-xs text-text-muted">
                        {{ t('cursus.importRoadmap.conceptCount', { n: entry.conceptCount }) }}
                      </p>
                    </div>
                  </button>
                </div>
              </template>
            </template>

            <!-- Custom JSON mode -->
            <template v-else>
              <p class="mb-3 text-sm text-text-muted">
                {{ t('cursus.importRoadmap.customHelp') }}
              </p>

              <!-- JSON example -->
              <details class="mb-3">
                <summary class="cursor-pointer text-xs text-text-muted hover:text-text-default">
                  {{ t('cursus.importRoadmap.showExample') }}
                </summary>
                <pre class="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-text-default"><code>{{ `[\n  { "title": "HTML & CSS" },\n  { "title": "JavaScript", "url": "https://roadmap.sh/javascript" },\n  { "title": "TypeScript" }\n]` }}</code></pre>
              </details>

              <UTextarea
                v-model="customJson"
                :placeholder="t('cursus.importRoadmap.jsonPlaceholder')"
                :rows="10"
                class="font-mono text-sm"
                :aria-label="t('cursus.importRoadmap.jsonLabel')"
                @update:model-value="parseCustomJson"
              />

              <!-- Parse error -->
              <p v-if="jsonParseError" class="mt-2 flex items-center gap-1.5 text-sm text-danger-fg">
                <UIcon name="i-tabler-alert-circle" class="size-4 shrink-0" />
                {{ jsonParseError }}
              </p>

              <!-- Concepts count -->
              <p
                v-if="parsedConcepts.length > 0 && !jsonParseError"
                class="mt-2 flex items-center gap-1.5 text-sm text-success-fg"
              >
                <UIcon name="i-tabler-check" class="size-4 shrink-0" />
                {{ t('cursus.importRoadmap.conceptsParsed', { n: parsedConcepts.length }) }}
              </p>
            </template>
          </div>

          <!-- Footer: mode replace/append + proceed -->
          <div
            class="flex shrink-0 flex-col gap-3 border-t border-border-subtle px-6 py-4"
          >
            <!-- Replace / Append toggle -->
            <div
              v-if="hasExistingModules"
              class="rounded-lg border border-border-subtle bg-warning-bg p-3"
            >
              <p class="mb-2 text-sm font-medium text-warning-fg">
                <UIcon name="i-tabler-alert-triangle" class="inline size-4" />
                {{ t('cursus.importRoadmap.existingModulesWarning') }}
              </p>
              <div class="flex gap-3">
                <label class="flex cursor-pointer items-center gap-2 text-sm text-text-default">
                  <input
                    v-model="importMode"
                    type="radio"
                    value="replace"
                    class="accent-accent"
                  >
                  {{ t('cursus.importRoadmap.modeReplace') }}
                </label>
                <label class="flex cursor-pointer items-center gap-2 text-sm text-text-default">
                  <input
                    v-model="importMode"
                    type="radio"
                    value="append"
                    class="accent-accent"
                  >
                  {{ t('cursus.importRoadmap.modeAppend') }}
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="close">
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                icon="i-tabler-arrow-right"
                :disabled="!canProceed"
                @click="goToPreview"
              >
                {{ t('cursus.importRoadmap.preview') }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Step: Preview -->
        <div v-else-if="step === 'preview'" class="flex flex-col">
          <div class="px-6 py-6">
            <!-- Summary card -->
            <div class="mb-6 rounded-lg border border-border-subtle bg-muted p-4">
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-lg bg-accent">
                  <UIcon name="i-tabler-stack-2" class="size-5 text-accent-text" />
                </div>
                <div>
                  <p class="font-medium text-text-strong">{{ previewInfo?.title }}</p>
                  <p class="text-sm text-text-muted">
                    {{
                      t('cursus.importRoadmap.previewModules', {
                        n: previewInfo?.conceptCount ?? 0,
                      })
                    }}
                  </p>
                </div>
              </div>

              <!-- Replace warning -->
              <div
                v-if="importMode === 'replace' && hasExistingModules"
                class="mt-3 flex items-start gap-2 rounded-md border border-border-subtle bg-danger-bg p-2 text-sm text-danger-fg"
              >
                <UIcon name="i-tabler-trash" class="mt-0.5 size-4 shrink-0" />
                {{ t('cursus.importRoadmap.replaceWarning') }}
              </div>

              <!-- Append info -->
              <div
                v-if="importMode === 'append' && hasExistingModules"
                class="mt-3 flex items-start gap-2 rounded-md border border-border-subtle bg-info-bg p-2 text-sm text-info-fg"
              >
                <UIcon name="i-tabler-plus" class="mt-0.5 size-4 shrink-0" />
                {{ t('cursus.importRoadmap.appendInfo') }}
              </div>
            </div>

            <!-- Attribution notice -->
            <div
              class="flex items-start gap-2 rounded-lg border border-border-subtle bg-muted p-3 text-xs text-text-muted"
            >
              <UIcon name="i-tabler-license" class="mt-0.5 size-4 shrink-0 text-text-subtle" />
              <span>
                {{ t('cursus.importRoadmap.attribution') }}
                <a
                  href="https://roadmap.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-text-default"
                >roadmap.sh</a>
                (CC BY-SA 4.0).
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 border-t border-border-subtle px-6 py-4">
            <UButton color="neutral" variant="ghost" @click="goBack">
              <UIcon name="i-tabler-arrow-left" class="size-4" />
              {{ t('common.back') }}
            </UButton>
            <UButton
              icon="i-tabler-download"
              :loading="loading"
              :disabled="loading"
              @click="handleImport"
            >
              {{ t('cursus.importRoadmap.import') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
