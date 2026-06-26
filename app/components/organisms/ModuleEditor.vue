<script setup lang="ts">
/**
 * ModuleEditor — panneau d'édition détaillée d'un module (expandable).
 * Cf. ST-03.2 — TT-03.2.2.
 *
 * - Titre, semaine, objectifs (markdown avec preview), XP.
 * - Ressources : liste {label, url} avec add/remove.
 * - Livrable : description, repoRequired, deployRequired.
 * - Auto-save via l'émission de l'événement `update`.
 */
import type { ModuleItem, ModuleResource, DeliverableSpec } from '~/composables/useModules';

interface Props {
  module: ModuleItem;
  expanded?: boolean;
  isSaving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false,
  isSaving: false,
});

const emit = defineEmits<{
  update: [data: Partial<ModuleItem>];
  delete: [];
  close: [];
}>();

const { t } = useT();

const showPreview = ref(false);

// ─── Local copies des champs ──────────────────────────────────────────────────

const title = ref(props.module.title);
const week = ref(props.module.week);
const objectives = ref(props.module.objectives);
const xpReward = ref(props.module.xpReward);
const resources = ref<ModuleResource[]>(
  JSON.parse(JSON.stringify(props.module.resourcesJson)) as ModuleResource[],
);
const deliverable = ref<DeliverableSpec>(
  JSON.parse(JSON.stringify(props.module.deliverableSpecJson)) as DeliverableSpec,
);

// Resync si le module change (après sauvegarde externe).
watch(
  () => props.module,
  (m) => {
    title.value = m.title;
    week.value = m.week;
    objectives.value = m.objectives;
    xpReward.value = m.xpReward;
    resources.value = JSON.parse(JSON.stringify(m.resourcesJson)) as ModuleResource[];
    deliverable.value = JSON.parse(JSON.stringify(m.deliverableSpecJson)) as DeliverableSpec;
  },
);

// ─── Émission auto-save ────────────────────────────────────────────────────────

function emitUpdate(): void {
  emit('update', {
    title: title.value,
    week: week.value,
    objectives: objectives.value,
    xpReward: xpReward.value,
    resourcesJson: resources.value,
    deliverableSpecJson: deliverable.value,
  });
}

function onTitleChange(v: string): void {
  title.value = v;
  emitUpdate();
}

function onWeekChange(v: string): void {
  week.value = Number(v);
  emitUpdate();
}

function onXpChange(v: string): void {
  xpReward.value = Number(v);
  emitUpdate();
}

function onObjectivesChange(v: string): void {
  objectives.value = v;
  emitUpdate();
}

function onDeliverableDescChange(v: string): void {
  deliverable.value = { ...deliverable.value, description: v };
  emitUpdate();
}

function onRepoRequiredChange(v: boolean): void {
  deliverable.value = { ...deliverable.value, repoRequired: v };
  emitUpdate();
}

function onDeployRequiredChange(v: boolean): void {
  deliverable.value = { ...deliverable.value, deployRequired: v };
  emitUpdate();
}

// ─── Ressources ───────────────────────────────────────────────────────────────

function addResource(): void {
  resources.value = [...resources.value, { label: '', url: '' }];
  emitUpdate();
}

function removeResource(index: number): void {
  resources.value = resources.value.filter((_, i) => i !== index);
  emitUpdate();
}

function updateResourceLabel(index: number, value: string): void {
  const updated = resources.value.map((r, i) => (i === index ? { ...r, label: value } : r));
  resources.value = updated;
  emitUpdate();
}

function updateResourceUrl(index: number, value: string): void {
  const updated = resources.value.map((r, i) => (i === index ? { ...r, url: value } : r));
  resources.value = updated;
  emitUpdate();
}

// ─── Preview markdown simple ──────────────────────────────────────────────────

const objectivesPreview = computed(() =>
  objectives.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>'),
);
</script>

<template>
  <div v-if="props.expanded" class="border-t border-border-subtle bg-muted/30 px-4 py-5">
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <!-- Titre -->
      <div class="sm:col-span-2">
        <CInput
          :model-value="title"
          :label="t('modules.fields.title')"
          :placeholder="t('modules.fields.titlePlaceholder')"
          @update:model-value="onTitleChange"
        />
      </div>

      <!-- Semaine -->
      <CInput
        :model-value="String(week)"
        type="number"
        :label="t('modules.week')"
        @update:model-value="onWeekChange"
      />

      <!-- XP Récompense -->
      <CInput
        :model-value="String(xpReward)"
        type="number"
        :label="t('modules.xpReward')"
        @update:model-value="onXpChange"
      />

      <!-- Objectifs -->
      <div class="sm:col-span-2">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-sm font-medium text-text-strong">{{ t('modules.objectives') }}</span>
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-default"
            :aria-pressed="showPreview"
            @click="showPreview = !showPreview"
          >
            <UIcon name="i-tabler-eye" class="size-3.5" />
            {{ showPreview ? t('modules.edit') : t('modules.preview') }}
          </button>
        </div>

        <!-- Preview mode — objectivesPreview contient uniquement du texte échappé + <br>.
             Le XSS est impossible car & < > sont tous remplacés avant insertion. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          v-if="showPreview"
          class="min-h-24 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default"
          aria-live="polite"
          aria-label="Markdown preview"
          v-html="objectivesPreview"
        />

        <!-- Edit mode -->
        <CTextarea
          v-else
          :model-value="objectives"
          :placeholder="t('modules.fields.objectivesPlaceholder')"
          :rows="5"
          @update:model-value="onObjectivesChange"
        />
        <span class="mt-0.5 block text-xs text-text-subtle">
          {{ objectives.length }}/5000 — Markdown supporté
        </span>
      </div>

      <!-- Ressources -->
      <div class="sm:col-span-2">
        <p class="mb-2 text-sm font-medium text-text-strong">{{ t('modules.resources') }}</p>

        <div class="space-y-2">
          <div v-for="(resource, idx) in resources" :key="idx" class="flex items-start gap-2">
            <div class="grid flex-1 grid-cols-2 gap-2">
              <CInput
                :model-value="resource.label"
                :placeholder="t('modules.fields.resourceLabel')"
                @update:model-value="(v: string) => updateResourceLabel(idx, v)"
              />
              <CInput
                :model-value="resource.url"
                type="url"
                :placeholder="t('modules.fields.resourceUrl')"
                @update:model-value="(v: string) => updateResourceUrl(idx, v)"
              />
            </div>
            <button
              type="button"
              class="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
              :aria-label="t('modules.removeResource')"
              @click="removeResource(idx)"
            >
              <UIcon name="i-tabler-x" class="size-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          class="mt-2 flex items-center gap-1 text-sm text-accent-text transition-colors hover:text-accent-text/80"
          @click="addResource"
        >
          <UIcon name="i-tabler-plus" class="size-4" />
          {{ t('modules.addResource') }}
        </button>
      </div>

      <!-- Livrable -->
      <div class="sm:col-span-2">
        <p class="mb-3 text-sm font-medium text-text-strong">{{ t('modules.deliverable') }}</p>

        <div class="space-y-3">
          <CTextarea
            :model-value="deliverable.description"
            :label="t('modules.fields.deliverableDescription')"
            :placeholder="t('modules.fields.deliverableDescriptionPlaceholder')"
            :rows="3"
            @update:model-value="onDeliverableDescChange"
          />

          <CSwitch
            :model-value="deliverable.repoRequired"
            :label="t('modules.fields.repoRequired')"
            :description="t('modules.fields.repoRequiredDescription')"
            @update:model-value="onRepoRequiredChange"
          />

          <CSwitch
            :model-value="deliverable.deployRequired"
            :label="t('modules.fields.deployRequired')"
            :description="t('modules.fields.deployRequiredDescription')"
            @update:model-value="onDeployRequiredChange"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between sm:col-span-2">
        <UButton
          type="button"
          color="error"
          variant="ghost"
          size="sm"
          icon="i-tabler-trash"
          @click="emit('delete')"
        >
          {{ t('modules.delete') }}
        </UButton>

        <p v-if="isSaving" class="flex items-center gap-1 text-xs text-text-muted" role="status">
          <UIcon name="i-tabler-loader-2" class="size-3.5 animate-spin" />
          {{ t('modules.saving') }}
        </p>
      </div>
    </div>
  </div>
</template>
