<script setup lang="ts">
/**
 * Page /cursus/new — création d'un nouveau cursus (brouillon).
 * Cf. ST-03.1 — TT-03.1.6.
 */
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { createCursusSchema } from '~~/shared/schemas/cursus';
import type { CreateCursusInput } from '~~/shared/schemas/cursus';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Nouveau cursus — Cursus', robots: 'noindex' });

const { t } = useI18n();
const toast = useToast();
const { createCursus, loading } = useCursus();
const { canManageCursus } = usePermission();

// Redirection si pas les droits.
onMounted(() => {
  if (!canManageCursus()) {
    void navigateTo('/cursus');
  }
});

// ─── Formulaire ───────────────────────────────────────────────────────────────

const form = useForm({
  validationSchema: toTypedSchema(createCursusSchema),
  initialValues: {
    level: 'BEGINNER' as const,
    domain: 'dev-web' as const,
    durationWeeks: 8,
  },
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
  try {
    const cursus = await createCursus(values);
    toast.add({
      title: t('cursus.createSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
    await navigateTo(`/cursus/${cursus.id}/edit`);
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
      :items="[{ label: t('cursus.title'), to: '/cursus' }, { label: t('cursus.new') }]"
      class="mb-6"
    />

    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('cursus.create') }}
      </h1>
      <p class="mt-1 text-sm text-text-muted">
        {{ t('cursus.fields.titlePlaceholder') }}
      </p>
    </div>

    <UCard class="border border-border-subtle bg-surface">
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

        <!-- Domaine + Niveau (côte à côte sur desktop) -->
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('cursus.fields.domain')" name="domain" required>
            <USelect
              id="domain"
              name="domain"
              :options="domainOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-full"
              :model-value="form.values.domain ?? 'dev-web'"
              @update:model-value="
                form.setFieldValue('domain', $event as CreateCursusInput['domain'])
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
              :model-value="form.values.level ?? 'BEGINNER'"
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
            :model-value="String(form.values.durationWeeks ?? 8)"
            @update:model-value="form.setFieldValue('durationWeeks', Number($event))"
            @blur="form.validateField('durationWeeks')"
          />
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
            {{ t('cursus.actions.createDraft') }}
          </UButton>
          <!-- eslint-disable-next-line link-checker/valid-route -->
          <UButton type="button" to="/cursus" color="neutral" variant="ghost" :disabled="loading">
            {{ t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
