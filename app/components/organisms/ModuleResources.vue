<script setup lang="ts">
/**
 * ModuleResources — Gestion des ressources d'un module.
 *
 * Permet d'ajouter, éditer, supprimer et réordonner les ressources
 * (liens, vidéos, PDF, articles, docs, cours) d'un module.
 * L'aperçu OG (titre, image, description) est récupéré de manière asynchrone.
 *
 * Cf. ST-03.3 TT-03.3.3.
 */
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { resourceTypeEnum } from '~~/shared/schemas/module';
import type { Resource, ResourceType } from '~~/shared/schemas/module';

// ─── Props & Emits ───────────────────────────────────────────────────────────

const props = defineProps<{
  cursusId: string;
  moduleId: string;
  /** Ressources initiales depuis le serveur. */
  modelValue: Resource[];
  /** Désactive les interactions (cursus archivé, stagiaire, etc.). */
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [resources: Resource[]];
}>();

// ─── i18n ─────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─── State ────────────────────────────────────────────────────────────────────

const newResourceSchema = z.object({
  url: z.string().url(t('cursus.modules.resources.errors.urlInvalid')).max(2000),
  title: z
    .string()
    .min(1, t('cursus.modules.resources.errors.titleRequired'))
    .max(100, t('cursus.modules.resources.errors.titleTooLong')),
  type: resourceTypeEnum,
  duration: z.number().int().min(0).max(600).optional(),
});

const {
  handleSubmit: handleAddSubmit,
  defineField,
  errors: addErrors,
  resetForm,
} = useForm({
  validationSchema: toTypedSchema(newResourceSchema),
  initialValues: { url: '', title: '', type: 'link' as ResourceType, duration: undefined },
});

const [urlField, urlAttrs] = defineField('url');
const [titleField, titleAttrs] = defineField('title');
const [typeField] = defineField('type');

// Local copy of resources for optimistic UI
const localResources = ref<Resource[]>([...props.modelValue]);

watch(
  () => props.modelValue,
  (val) => {
    localResources.value = [...val];
  },
);

const isAdding = ref(false);
const isSaving = ref(false);
const ogLoadingIds = ref<Set<string>>(new Set());
const ogErrorIds = ref<Set<string>>(new Set());

// ─── Resource type options ────────────────────────────────────────────────────

interface TypeOption {
  value: ResourceType;
  label: string;
  icon: string;
}

const typeOptions = computed<TypeOption[]>(() => [
  { value: 'link', label: t('cursus.modules.resources.types.link'), icon: 'i-tabler-link' },
  { value: 'video', label: t('cursus.modules.resources.types.video'), icon: 'i-tabler-video' },
  {
    value: 'pdf',
    label: t('cursus.modules.resources.types.pdf'),
    icon: 'i-tabler-file-type-pdf',
  },
  {
    value: 'article',
    label: t('cursus.modules.resources.types.article'),
    icon: 'i-tabler-article',
  },
  { value: 'doc', label: t('cursus.modules.resources.types.doc'), icon: 'i-tabler-book' },
  { value: 'course', label: t('cursus.modules.resources.types.course'), icon: 'i-tabler-school' },
]);

function getTypeIcon(type: ResourceType): string {
  return typeOptions.value.find((o) => o.value === type)?.icon ?? 'i-tabler-link';
}

function getTypeLabel(type: ResourceType): string {
  return typeOptions.value.find((o) => o.value === type)?.label ?? type;
}

// ─── OG scraping ─────────────────────────────────────────────────────────────

async function fetchOg(resource: Resource): Promise<void> {
  ogLoadingIds.value.add(resource.id);
  ogErrorIds.value.delete(resource.id);

  try {
    const data = await $fetch<{
      title: string | null;
      image: string | null;
      description: string | null;
    }>(`/api/cursus/${props.cursusId}/modules/${props.moduleId}/og`, {
      method: 'POST',
      body: { url: resource.url },
    });

    const idx = localResources.value.findIndex((r) => r.id === resource.id);
    const existing = idx !== -1 ? localResources.value[idx] : undefined;
    if (idx !== -1 && existing) {
      localResources.value[idx] = {
        ...existing,
        ogTitle: data.title ?? undefined,
        ogImage: data.image ?? undefined,
        ogDescription: data.description ?? undefined,
      };
      await persistResources();
    }
  } catch {
    ogErrorIds.value.add(resource.id);
  } finally {
    ogLoadingIds.value.delete(resource.id);
  }
}

// ─── Persist ─────────────────────────────────────────────────────────────────

async function persistResources(): Promise<void> {
  if (isSaving.value) {
    return;
  }
  isSaving.value = true;

  try {
    await $fetch(`/api/cursus/${props.cursusId}/modules/${props.moduleId}`, {
      method: 'PATCH',
      body: { resources: localResources.value },
    });
    emit('update:modelValue', [...localResources.value]);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : t('cursus.modules.resources.saveErrorFallback');
    useToast().add({
      title: t('cursus.modules.resources.saveErrorTitle'),
      description: msg,
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

// ─── Add resource ─────────────────────────────────────────────────────────────

const handleAdd = handleAddSubmit(async (values) => {
  if (localResources.value.length >= 20) {
    useToast().add({
      title: t('cursus.modules.resources.limitReachedTitle'),
      description: t('cursus.modules.resources.limitReachedDesc'),
      color: 'warning',
    });
    return;
  }

  const newResource: Resource = {
    id: crypto.randomUUID(),
    url: values.url,
    title: values.title,
    type: values.type,
    duration: values.duration,
    position: localResources.value.length,
    status: 'active',
    ogTitle: null,
    ogImage: null,
    ogDescription: null,
  };

  localResources.value.push(newResource);
  isAdding.value = false;
  resetForm();

  await persistResources();

  // Fetch OG in background (non-blocking)
  void fetchOg(newResource);
});

// ─── Delete resource ──────────────────────────────────────────────────────────

async function removeResource(id: string): Promise<void> {
  localResources.value = localResources.value
    .filter((r) => r.id !== id)
    .map((r, idx) => ({ ...r, position: idx }));

  await persistResources();
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

function moveUp(idx: number): void {
  if (idx === 0) {
    return;
  }
  const arr = [...localResources.value];
  const prev = arr[idx - 1];
  const current = arr[idx];
  if (!prev || !current) {
    return;
  }
  arr[idx - 1] = { ...current, position: idx - 1 };
  arr[idx] = { ...prev, position: idx };
  localResources.value = arr;
  void persistResources();
}

function moveDown(idx: number): void {
  if (idx === localResources.value.length - 1) {
    return;
  }
  const arr = [...localResources.value];
  const next = arr[idx + 1];
  const current = arr[idx];
  if (!next || !current) {
    return;
  }
  arr[idx + 1] = { ...current, position: idx + 1 };
  arr[idx] = { ...next, position: idx };
  localResources.value = arr;
  void persistResources();
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
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="i-tabler-books text-lg text-text-muted" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-text-strong">
          {{ t('cursus.modules.resources.title') }}
          <span v-if="localResources.length > 0" class="ml-1 font-normal text-text-muted"
            >({{ localResources.length }}/20)</span
          >
        </h3>
      </div>

      <UButton
        v-if="!readonly && localResources.length < 20"
        size="xs"
        variant="ghost"
        leading-icon="i-tabler-plus"
        :disabled="isAdding"
        @click="isAdding = true"
      >
        {{ t('cursus.modules.resources.add') }}
      </UButton>
    </div>

    <!-- Add form -->
    <div
      v-if="isAdding"
      class="space-y-3 rounded-lg border border-border-subtle bg-surface p-4"
      role="form"
      :aria-label="t('cursus.modules.resources.formAriaLabel')"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1">
          <label for="resource-url" class="text-xs font-medium text-text-muted">{{
            t('cursus.modules.resources.urlLabel')
          }}</label>
          <UInput
            id="resource-url"
            :model-value="urlField ?? ''"
            v-bind="urlAttrs"
            :placeholder="t('cursus.modules.resources.urlPlaceholder')"
            type="url"
            size="sm"
            :status="addErrors.url ? 'error' : undefined"
            @update:model-value="urlField = $event"
          />
          <p v-if="addErrors.url" class="text-xs text-danger-fg">{{ addErrors.url }}</p>
        </div>

        <div class="space-y-1">
          <label for="resource-title" class="text-xs font-medium text-text-muted">{{
            t('cursus.modules.resources.titleLabel')
          }}</label>
          <UInput
            id="resource-title"
            :model-value="titleField ?? ''"
            v-bind="titleAttrs"
            :placeholder="t('cursus.modules.resources.titlePlaceholder')"
            size="sm"
            :status="addErrors.title ? 'error' : undefined"
            @update:model-value="titleField = $event"
          />
          <p v-if="addErrors.title" class="text-xs text-danger-fg">{{ addErrors.title }}</p>
        </div>
      </div>

      <div class="space-y-1">
        <label for="resource-type" class="text-xs font-medium text-text-muted">{{
          t('cursus.modules.resources.typeLabel')
        }}</label>
        <USelect
          id="resource-type"
          :model-value="typeField ?? 'link'"
          size="sm"
          :options="typeOptions.map((o) => ({ label: o.label, value: o.value }))"
          @update:model-value="typeField = $event as ResourceType"
        />
      </div>

      <div class="flex items-center justify-end gap-2">
        <UButton
          size="xs"
          variant="ghost"
          @click="
            isAdding = false;
            resetForm();
          "
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          size="xs"
          @click="
            () => {
              void handleAdd();
            }
          "
        >
          {{ t('cursus.modules.resources.addResource') }}
        </UButton>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="localResources.length === 0 && !isAdding"
      class="rounded-lg border border-dashed border-border-subtle bg-muted/40 py-8 text-center"
    >
      <span
        class="i-tabler-books mx-auto mb-2 block text-2xl text-text-subtle"
        aria-hidden="true"
      />
      <p class="text-sm text-text-muted">{{ t('cursus.modules.resources.emptyState') }}</p>
      <p v-if="!readonly" class="mt-1 text-xs text-text-subtle">
        {{ t('cursus.modules.resources.emptyStateHint') }}
      </p>
    </div>

    <!-- Resource list -->
    <ul
      v-else-if="localResources.length > 0"
      class="space-y-2"
      :aria-label="t('cursus.modules.resources.listAriaLabel')"
    >
      <li
        v-for="(resource, idx) in localResources"
        :key="resource.id"
        class="group rounded-lg border bg-surface transition-colors"
        :class="[
          resource.status === 'broken'
            ? 'border-warning-solid/50 bg-warning-bg/30'
            : 'border-border-subtle',
        ]"
      >
        <div class="flex items-start gap-3 p-3">
          <!-- Type icon -->
          <span
            :class="getTypeIcon(resource.type)"
            class="mt-0.5 shrink-0 text-base text-text-muted"
            :aria-label="getTypeLabel(resource.type)"
          />

          <!-- OG preview or basic info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-start gap-2">
              <!-- OG image -->
              <img
                v-if="resource.ogImage"
                :src="resource.ogImage"
                :alt="resource.ogTitle ?? resource.title"
                class="h-12 w-20 shrink-0 rounded object-cover"
                loading="lazy"
              >

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-text-strong">
                  {{ resource.ogTitle ?? resource.title }}
                </p>
                <a
                  :href="safeHref(resource.url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="truncate text-xs text-accent-text hover:underline focus-visible:underline"
                >
                  {{ resource.url }}
                </a>
                <p
                  v-if="resource.ogDescription"
                  class="mt-0.5 line-clamp-2 text-xs text-text-muted"
                >
                  {{ resource.ogDescription }}
                </p>
              </div>
            </div>

            <!-- Badges -->
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-text-muted"
              >
                {{ getTypeLabel(resource.type) }}
              </span>

              <span
                v-if="resource.duration"
                class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-text-muted"
              >
                <span class="i-tabler-clock text-xs" aria-hidden="true" />
                {{ resource.duration }} min
              </span>

              <!-- Broken badge -->
              <span
                v-if="resource.status === 'broken'"
                class="inline-flex items-center gap-1 rounded bg-warning-bg px-1.5 py-0.5 text-xs text-warning-fg"
                role="status"
              >
                <span class="i-tabler-alert-triangle text-xs" aria-hidden="true" />
                {{ t('cursus.modules.resources.brokenLink') }}
              </span>

              <!-- OG loading indicator -->
              <span
                v-if="ogLoadingIds.has(resource.id)"
                class="inline-flex items-center gap-1 text-xs text-text-subtle"
                aria-live="polite"
              >
                <span class="i-tabler-loader-2 animate-spin text-xs" aria-hidden="true" />
                {{ t('cursus.modules.resources.ogLoading') }}
              </span>

              <!-- OG error -->
              <span
                v-if="ogErrorIds.has(resource.id)"
                class="inline-flex items-center gap-1 text-xs text-text-subtle"
              >
                <span class="i-tabler-photo-off text-xs" aria-hidden="true" />
                {{ t('cursus.modules.resources.ogError') }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="!readonly"
            class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          >
            <!-- Move up -->
            <UButton
              size="xs"
              variant="ghost"
              icon="i-tabler-chevron-up"
              :disabled="idx === 0"
              :aria-label="t('cursus.modules.resources.moveUpAriaLabel', { title: resource.title })"
              @click="moveUp(idx)"
            />
            <!-- Move down -->
            <UButton
              size="xs"
              variant="ghost"
              icon="i-tabler-chevron-down"
              :disabled="idx === localResources.length - 1"
              :aria-label="
                t('cursus.modules.resources.moveDownAriaLabel', { title: resource.title })
              "
              @click="moveDown(idx)"
            />
            <!-- Delete -->
            <UButton
              size="xs"
              variant="ghost"
              icon="i-tabler-trash"
              color="error"
              :aria-label="
                t('cursus.modules.resources.removeAriaLabel', { title: resource.title })
              "
              @click="removeResource(resource.id)"
            />
          </div>
        </div>
      </li>
    </ul>

    <!-- Saving indicator -->
    <div
      v-if="isSaving"
      class="flex items-center gap-1.5 text-xs text-text-subtle"
      aria-live="polite"
    >
      <span class="i-tabler-loader-2 animate-spin" aria-hidden="true" />
      {{ t('cursus.modules.resources.saving') }}
    </div>
  </div>
</template>
