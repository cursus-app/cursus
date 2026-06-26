<script setup lang="ts">
/**
 * Page /cursus/:id/edit — édition d'un cursus existant.
 * Cf. ST-03.1 — TT-03.1.8.
 *
 * - Chargement du cursus au montage.
 * - Formulaire pré-rempli avec les données existantes.
 * - Soumission manuelle (pas d'autosave ici pour ne pas écraser des saisies en cours).
 * - Un cursus ARCHIVED ne peut pas être modifié.
 */
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { updateCursusSchema } from '~~/shared/schemas/cursus';
import type { UpdateCursusInput } from '~~/shared/schemas/cursus';
import type { CursusFull } from '~/composables/useCursus';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { getCursus, updateCursus, loading } = useCursus();
const { canManageCursus } = usePermission();
const userStore = useUserStore();

const cursusId = computed(() => {
  const rawId = route.params['id'];
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
});

useSeoMeta({ title: 'Modifier le cursus — Cursus', robots: 'noindex' });

// ─── Données ──────────────────────────────────────────────────────────────────

const cursus = ref<CursusFull | null>(null);
const isLoadingPage = ref(true);
const isSaved = ref(false);

async function loadCursus() {
  isLoadingPage.value = true;
  try {
    const data = await getCursus(cursusId.value);
    cursus.value = data;
    useSeoMeta({ title: `Modifier — ${data.title} — Cursus`, robots: 'noindex' });

    // Vérification des droits
    const isOwnerOrAdmin = userStore.userId === data.ownerId || userStore.globalRole === 'ADMIN';

    if (!isOwnerOrAdmin || !canManageCursus()) {
      await navigateTo(`/cursus/${cursusId.value}`);
      return;
    }

    if (data.status === 'ARCHIVED') {
      toast.add({
        title: t('cursus.errors.cannotEditArchived'),
        color: 'warning',
        icon: 'i-tabler-alert-triangle',
      });
      await navigateTo(`/cursus/${cursusId.value}`);
      return;
    }

    // Pré-remplir le formulaire
    form.setValues({
      title: data.title,
      domain: data.domain as UpdateCursusInput['domain'],
      level: data.level,
      durationWeeks: data.durationWeeks,
      description: data.description ?? undefined,
      prerequisites: data.prerequisites ?? undefined,
      slug: data.slug,
    });
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number };
    if (fetchErr.statusCode === 404) {
      await navigateTo('/cursus');
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
  void loadCursus();
});

// ─── Formulaire ───────────────────────────────────────────────────────────────

const form = useForm({
  validationSchema: toTypedSchema(updateCursusSchema),
});

const domainOptions = [
  { label: t('cursus.domain.dev-web'), value: 'dev-web' },
  { label: t('cursus.domain.ingenierie-web'), value: 'ingenierie-web' },
  { label: t('cursus.domain.ia'), value: 'ia' },
  { label: t('cursus.domain.cybersec'), value: 'cybersec' },
  { label: t('cursus.domain.autre'), value: 'autre' },
];

const levelOptions = [
  { label: t('cursus.level.BEGINNER'), value: 'BEGINNER' },
  { label: t('cursus.level.INTERMEDIATE'), value: 'INTERMEDIATE' },
  { label: t('cursus.level.ADVANCED'), value: 'ADVANCED' },
];

const onSubmit = form.handleSubmit(async (values) => {
  if (!cursus.value) {
    return;
  }
  isSaved.value = false;
  try {
    const updated = await updateCursus(cursus.value.id, values);
    cursus.value = { ...cursus.value, ...updated };
    isSaved.value = true;
    toast.add({
      title: t('cursus.saveSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
});
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <!-- Fil d'Ariane -->
    <!-- eslint-disable-next-line link-checker/valid-route -->
    <UBreadcrumb
      :items="[
        { label: t('cursus.title'), to: '/cursus' },
        {
          label: cursus?.title ?? '…',
          ...(cursusId ? { to: `/cursus/${cursusId}` as string } : {}),
        },
        { label: t('cursus.edit') },
      ]"
      class="mb-6"
    />

    <div class="mb-8 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('cursus.edit') }}
      </h1>
      <!-- Indicateur sauvegardé -->
      <p
        v-if="isSaved"
        class="flex items-center gap-1 text-sm text-success-fg"
        role="status"
        aria-live="polite"
      >
        <UIcon name="i-tabler-check" class="size-4" />
        {{ t('cursus.saveSuccess') }}
      </p>
    </div>

    <!-- Skeleton chargement -->
    <div v-if="isLoadingPage" class="space-y-6">
      <div class="skeleton h-12 rounded-lg" />
      <div class="skeleton h-48 rounded-lg" />
    </div>

    <UCard v-else-if="cursus" class="border border-border-subtle bg-surface">
      <form novalidate class="space-y-6" @submit="onSubmit">
        <!-- Titre -->
        <UFormField :label="t('cursus.fields.title')" name="title" required>
          <UInput
            id="title"
            name="title"
            type="text"
            :placeholder="t('cursus.fields.titlePlaceholder')"
            class="w-full"
            :model-value="form.values.title ?? ''"
            @update:model-value="form.setFieldValue('title', $event as string)"
            @blur="form.validateField('title')"
          />
        </UFormField>

        <!-- Domaine + Niveau -->
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('cursus.fields.domain')" name="domain" required>
            <USelect
              id="domain"
              name="domain"
              :options="domainOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :model-value="form.values.domain ?? ''"
              @update:model-value="
                form.setFieldValue('domain', $event as UpdateCursusInput['domain'])
              "
            />
          </UFormField>

          <UFormField :label="t('cursus.fields.level')" name="level" required>
            <USelect
              id="level"
              name="level"
              :options="levelOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :model-value="form.values.level ?? ''"
              @update:model-value="
                form.setFieldValue('level', $event as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')
              "
            />
          </UFormField>
        </div>

        <!-- Durée -->
        <UFormField :label="t('cursus.fields.durationWeeks')" name="durationWeeks" required>
          <UInput
            id="durationWeeks"
            name="durationWeeks"
            type="number"
            min="1"
            max="52"
            class="w-full"
            :model-value="String(form.values.durationWeeks ?? '')"
            @update:model-value="form.setFieldValue('durationWeeks', Number($event))"
            @blur="form.validateField('durationWeeks')"
          />
        </UFormField>

        <!-- Identifiant URL (slug) -->
        <UFormField :label="t('cursus.fields.slug')" name="slug">
          <UInput
            id="slug"
            name="slug"
            type="text"
            :placeholder="t('cursus.fields.slugPlaceholder')"
            autocomplete="off"
            class="w-full"
            :model-value="form.values.slug ?? ''"
            @update:model-value="form.setFieldValue('slug', $event as string)"
            @blur="form.validateField('slug')"
          />
          <template #help>
            <span class="text-text-subtle">
              {{ t('cursus.fields.slugPlaceholder') }}
            </span>
          </template>
        </UFormField>

        <!-- Description -->
        <UFormField :label="t('cursus.fields.description')" name="description">
          <UTextarea
            id="description"
            name="description"
            :placeholder="t('cursus.fields.descriptionPlaceholder')"
            :rows="4"
            class="w-full"
            :model-value="form.values.description ?? ''"
            @update:model-value="form.setFieldValue('description', $event as string)"
            @blur="form.validateField('description')"
          />
          <template #help>
            <span class="text-text-subtle">
              {{ (form.values.description ?? '').length }}/5000
            </span>
          </template>
        </UFormField>

        <!-- Prérequis -->
        <UFormField :label="t('cursus.fields.prerequisites')" name="prerequisites">
          <UTextarea
            id="prerequisites"
            name="prerequisites"
            :placeholder="t('cursus.fields.prerequisitesPlaceholder')"
            :rows="3"
            class="w-full"
            :model-value="form.values.prerequisites ?? ''"
            @update:model-value="form.setFieldValue('prerequisites', $event as string)"
            @blur="form.validateField('prerequisites')"
          />
          <template #help>
            <span class="text-text-subtle">
              {{ (form.values.prerequisites ?? '').length }}/3000
            </span>
          </template>
        </UFormField>

        <!-- Boutons -->
        <div class="flex gap-3 pt-2">
          <UButton
            type="submit"
            color="primary"
            icon="i-tabler-device-floppy"
            :loading="loading"
            :disabled="loading"
          >
            {{ t('cursus.actions.save') }}
          </UButton>
          <UButton
            type="button"
            :to="`/cursus/${cursusId}`"
            color="neutral"
            variant="ghost"
            :disabled="loading"
          >
            {{ t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
