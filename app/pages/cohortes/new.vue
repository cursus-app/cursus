<script setup lang="ts">
/**
 * Page /cohortes/new — création d'une nouvelle cohorte (brouillon).
 * Cf. ST-04.1 — TT-04.1.3.
 */
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { cohorteCreateSchema } from '~~/shared/schemas/cohorte';
import type { CohorteCreateInput } from '~~/shared/schemas/cohorte';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Nouvelle cohorte — Cursus', robots: 'noindex' });

const { t } = useI18n();
const toast = useToast();
const { createCohorte, loading } = useCohorte();
const { canManageCohorte } = usePermission();

// Redirection si pas les droits.
onMounted(() => {
  if (!canManageCohorte()) {
    void navigateTo('/cohortes');
  }
  void fetchPublishedCursus();
});

// ─── Cursus publiés disponibles ───────────────────────────────────────────────

interface CursusOption {
  label: string;
  value: string;
}

const cursusOptions = ref<CursusOption[]>([]);
const loadingCursus = ref(false);

async function fetchPublishedCursus() {
  loadingCursus.value = true;
  try {
    const result = await $fetch<{ data: { id: string; title: string }[] }>('/api/cursus', {
      query: { status: 'PUBLISHED', limit: 100 },
    });
    cursusOptions.value = result.data.map((c) => ({ label: c.title, value: c.id }));
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    loadingCursus.value = false;
  }
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

const form = useForm({
  validationSchema: toTypedSchema(cohorteCreateSchema),
  initialValues: {
    rhythm: 'WEEKLY' as const,
  },
});

const rhythmOptions = [
  { label: t('cohortes.rhythmLabel.WEEKLY'), value: 'WEEKLY' },
  { label: t('cohortes.rhythmLabel.BIWEEKLY'), value: 'BIWEEKLY' },
  { label: t('cohortes.rhythmLabel.MONTHLY'), value: 'MONTHLY' },
  { label: t('cohortes.rhythmLabel.CUSTOM'), value: 'CUSTOM' },
];

const onSubmit = form.handleSubmit(async (values) => {
  try {
    const cohorte = await createCohorte(values as CohorteCreateInput);
    toast.add({
      title: t('cohortes.createSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
    await navigateTo(`/cohortes/${cohorte.id}`);
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
    <UBreadcrumb
      :items="[{ label: t('cohortes.title'), to: '/cohortes' }, { label: t('cohortes.new') }]"
      class="mb-6"
    />

    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('cohortes.createTitle') }}
      </h1>
      <p class="mt-1 text-sm text-text-muted">
        {{ t('cohortes.createSubtitle') }}
      </p>
    </div>

    <UCard class="border border-border-subtle bg-surface">
      <form novalidate class="space-y-6" @submit="onSubmit">
        <!-- Nom de la cohorte -->
        <UFormField :label="t('cohortes.name')" name="name" required>
          <UInput
            id="name"
            name="name"
            type="text"
            :placeholder="t('cohortes.namePlaceholder')"
            class="w-full"
            :model-value="form.values.name ?? ''"
            @update:model-value="form.setFieldValue('name', $event as string)"
            @blur="form.validateField('name')"
          />
        </UFormField>

        <!-- Cursus (publiés uniquement) -->
        <UFormField :label="t('cohortes.cursus')" name="cursusId" required>
          <USelect
            id="cursusId"
            name="cursusId"
            :options="cursusOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('cohortes.cursusPlaceholder')"
            :loading="loadingCursus"
            class="w-full"
            :model-value="form.values.cursusId ?? ''"
            @update:model-value="form.setFieldValue('cursusId', $event as string)"
          />
          <template v-if="cursusOptions.length === 0 && !loadingCursus" #help>
            <span class="text-warning-fg">
              {{ t('cohortes.errors.noPublishedCursus') }}
            </span>
          </template>
        </UFormField>

        <!-- Dates (côte à côte sur desktop) -->
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('cohortes.startDate')" name="startDate" required>
            <UInput
              id="startDate"
              name="startDate"
              type="date"
              class="w-full"
              :model-value="form.values.startDate ?? ''"
              @update:model-value="form.setFieldValue('startDate', $event as string)"
              @blur="form.validateField('startDate')"
            />
          </UFormField>

          <UFormField :label="t('cohortes.endDate')" name="endDate" required>
            <UInput
              id="endDate"
              name="endDate"
              type="date"
              class="w-full"
              :model-value="form.values.endDate ?? ''"
              @update:model-value="form.setFieldValue('endDate', $event as string)"
              @blur="form.validateField('endDate')"
            />
          </UFormField>
        </div>

        <!-- Rythme -->
        <UFormField :label="t('cohortes.rhythm')" name="rhythm" required>
          <USelect
            id="rhythm"
            name="rhythm"
            :options="rhythmOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full"
            :model-value="form.values.rhythm ?? 'WEEKLY'"
            @update:model-value="
              form.setFieldValue('rhythm', $event as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM')
            "
          />
        </UFormField>

        <!-- Boutons -->
        <div class="flex gap-3 pt-2">
          <UButton
            type="submit"
            color="primary"
            icon="i-tabler-device-floppy"
            :loading="loading"
            :disabled="loading || cursusOptions.length === 0"
          >
            {{ t('cohortes.createButton') }}
          </UButton>
          <UButton type="button" to="/cohortes" color="neutral" variant="ghost" :disabled="loading">
            {{ t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
