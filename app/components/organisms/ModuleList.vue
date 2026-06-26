<script setup lang="ts">
/**
 * ModuleList — liste draggable des modules d'un cursus.
 * Cf. ST-03.2 — TT-03.2.1, TT-03.2.4, TT-03.2.5, TT-03.2.6.
 *
 * - Drag-and-drop (vue-draggable-plus) avec annulation clavier (Alt+↑/↓).
 * - Chaque ligne est expandable → ModuleEditor.
 * - Auto-save débounce 1s via useModules.
 * - Annonce live des réordonnements (aria-live).
 * - Warning beforeunload si modifications non sauvegardées.
 */
import { VueDraggable } from 'vue-draggable-plus';
import type { ModuleItem } from '~/composables/useModules';

interface Props {
  cursusId: string;
}

const props = defineProps<Props>();

const { t } = useT();
const toast = useToast();

const cursusIdRef = computed(() => props.cursusId);
const {
  modules,
  isLoading,
  isSaving,
  isDirty,
  fetchModules,
  createModule,
  deleteModule,
  reorderModules,
  autosave,
  markDirty,
} = useModules(cursusIdRef);

onMounted(() => {
  void fetchModules();
});

// ─── Expansion ────────────────────────────────────────────────────────────────

const expandedId = ref<string | null>(null);

function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id;
}

// ─── Drag-and-drop ────────────────────────────────────────────────────────────

const liveAnnouncement = ref('');

function onDragEnd(): void {
  // Recalculer les semaines en fonction de la position dans la liste.
  const ordered = modules.value.map((m, i) => ({ id: m.id, week: i + 1 }));
  // Mise à jour optimiste locale.
  modules.value = modules.value.map((m, i) => ({ ...m, week: i + 1 }));
  liveAnnouncement.value = t('modules.reordered');
  void reorderModules(ordered).catch(() => {
    toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
  });
}

// ─── Clavier a11y : Alt+↑ / Alt+↓ ────────────────────────────────────────────

function moveModule(id: string, direction: 'up' | 'down'): void {
  const idx = modules.value.findIndex((m) => m.id === id);
  if (idx === -1) {
    return;
  }

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= modules.value.length) {
    return;
  }

  const next = [...modules.value];
  // Échanger les deux éléments.
  const a = next[idx];
  const b = next[targetIdx];
  if (!a || !b) {
    return;
  }
  next[idx] = b;
  next[targetIdx] = a;

  modules.value = next.map((m, i) => ({ ...m, week: i + 1 }));

  liveAnnouncement.value = t('modules.reordered');

  const ordered = modules.value.map((m) => ({ id: m.id, week: m.week }));
  void reorderModules(ordered).catch(() => {
    toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
  });
}

// ─── Ajout de module ──────────────────────────────────────────────────────────

const isCreating = ref(false);

async function handleAddModule(): Promise<void> {
  isCreating.value = true;
  try {
    const newModule = await createModule({ title: t('modules.defaultTitle') });
    expandedId.value = newModule.id;
    // Focus sera géré via nextTick dans le ModuleEditor
  } catch {
    toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
  } finally {
    isCreating.value = false;
  }
}

// ─── Suppression de module ────────────────────────────────────────────────────

async function handleDeleteModule(module: ModuleItem): Promise<void> {
  if (!confirm(t('modules.confirmDelete'))) {
    return;
  }
  try {
    await deleteModule(module.id);
    if (expandedId.value === module.id) {
      expandedId.value = null;
    }
    toast.add({
      title: t('modules.deleteSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
  } catch {
    toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
  }
}

// ─── Auto-save depuis ModuleEditor ────────────────────────────────────────────

function handleModuleUpdate(moduleId: string, data: Partial<ModuleItem>): void {
  markDirty();
  void autosave(moduleId, data);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Indicateur de sauvegarde -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text-strong">{{ t('modules.title') }}</h2>

      <span
        v-if="isDirty || isSaving"
        class="flex items-center gap-1.5 text-xs"
        role="status"
        aria-live="polite"
        :class="isSaving ? 'text-text-muted' : 'text-warning-fg'"
      >
        <UIcon
          :name="isSaving ? 'i-tabler-loader-2' : 'i-tabler-circle-dot'"
          class="size-3.5"
          :class="{ 'animate-spin': isSaving }"
        />
        {{ isSaving ? t('modules.saving') : t('modules.unsaved') }}
      </span>
      <span
        v-else
        class="flex items-center gap-1.5 text-xs text-success-fg"
        role="status"
        aria-live="polite"
      >
        <UIcon name="i-tabler-check" class="size-3.5" />
        {{ t('modules.saved') }}
      </span>
    </div>

    <!-- Région live pour les annonces drag-and-drop -->
    <span class="sr-only" aria-live="polite" aria-atomic="true">{{ liveAnnouncement }}</span>

    <!-- Skeleton chargement -->
    <div v-if="isLoading" class="space-y-2">
      <div class="skeleton h-14 rounded-lg" />
      <div class="skeleton h-14 rounded-lg" />
      <div class="skeleton h-14 rounded-lg" />
    </div>

    <!-- Liste vide -->
    <div
      v-else-if="modules.length === 0"
      class="rounded-lg border border-dashed border-border-subtle bg-surface py-10 text-center"
    >
      <UIcon name="i-tabler-puzzle" class="mx-auto mb-2 size-8 text-text-subtle" />
      <p class="text-sm text-text-muted">{{ t('modules.empty') }}</p>
    </div>

    <!-- Liste draggable -->
    <div v-else class="rounded-lg border border-border-subtle bg-surface">
      <VueDraggable
        v-model="modules"
        :animation="200"
        handle=".drag-handle"
        ghost-class="opacity-40"
        item-key="id"
        role="list"
        :aria-label="t('modules.title')"
        @end="onDragEnd"
      >
        <template #item="{ element: module, index }">
          <div
            :key="module.id"
            role="listitem"
            class="border-b border-border-subtle last:border-b-0"
          >
            <!-- Ligne principale -->
            <div
              class="flex items-center gap-3 px-3 py-3"
              :aria-label="`${t('modules.week')} ${module.week} — ${module.title}`"
            >
              <!-- Drag handle -->
              <button
                type="button"
                class="drag-handle flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-text-subtle transition-colors hover:text-text-default active:cursor-grabbing"
                :aria-label="t('modules.dragHandle')"
                tabindex="0"
              >
                <UIcon name="i-tabler-grip-vertical" class="size-4" />
              </button>

              <!-- Numéro de semaine -->
              <span
                class="flex w-8 shrink-0 items-center justify-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-text-muted"
                :aria-label="`${t('modules.week')} ${module.week}`"
              >
                S{{ module.week }}
              </span>

              <!-- Titre -->
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-text-default">
                {{ module.title || t('modules.untitled') }}
              </span>

              <!-- Actions clavier a11y -->
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="flex size-7 items-center justify-center rounded text-text-subtle transition-colors hover:bg-muted hover:text-text-default disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="index === 0"
                  :title="t('modules.moveUp')"
                  :aria-label="`${t('modules.moveUp')} — ${module.title}`"
                  @click.stop="moveModule(module.id, 'up')"
                >
                  <UIcon name="i-tabler-chevron-up" class="size-3.5" />
                </button>
                <button
                  type="button"
                  class="flex size-7 items-center justify-center rounded text-text-subtle transition-colors hover:bg-muted hover:text-text-default disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="index === modules.length - 1"
                  :title="t('modules.moveDown')"
                  :aria-label="`${t('modules.moveDown')} — ${module.title}`"
                  @click.stop="moveModule(module.id, 'down')"
                >
                  <UIcon name="i-tabler-chevron-down" class="size-3.5" />
                </button>

                <!-- Expand / collapse -->
                <button
                  type="button"
                  class="flex size-7 items-center justify-center rounded text-text-subtle transition-colors hover:bg-muted hover:text-text-default"
                  :aria-expanded="expandedId === module.id"
                  :aria-controls="`module-editor-${module.id}`"
                  :aria-label="
                    expandedId === module.id ? t('modules.collapse') : t('modules.expand')
                  "
                  @click="toggleExpand(module.id)"
                >
                  <UIcon
                    :name="
                      expandedId === module.id ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'
                    "
                    class="size-4"
                  />
                </button>
              </div>
            </div>

            <!-- Éditeur expandable -->
            <div :id="`module-editor-${module.id}`">
              <OrganismsModuleEditor
                :module="module"
                :expanded="expandedId === module.id"
                :is-saving="isSaving"
                @update="(data) => handleModuleUpdate(module.id, data)"
                @delete="() => handleDeleteModule(module)"
                @close="expandedId = null"
              />
            </div>
          </div>
        </template>
      </VueDraggable>
    </div>

    <!-- Bouton ajout -->
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      icon="i-tabler-plus"
      class="w-full justify-center"
      :loading="isCreating"
      :disabled="isCreating"
      @click="handleAddModule"
    >
      {{ t('modules.add') }}
    </UButton>
  </div>
</template>
