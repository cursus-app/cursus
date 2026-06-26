<script setup lang="ts">
/**
 * Page /cohortes/:id/edit — modification d'une cohorte (DRAFT seulement).
 * Redirige vers la vue détail si la cohorte n'est plus en DRAFT.
 * Cf. ST-04.1 — TT-04.1.3.
 */
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { cohorteUpdateSchema } from '~~/shared/schemas/cohorte';
import type { CohorteUpdateInput } from '~~/shared/schemas/cohorte';
import type { CohorteFull } from '~/composables/useCohorte';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Modifier la cohorte — Cursus', robots: 'noindex' });

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { getCohorte, updateCohorte, loading } = useCohorte();
const { canManageCohorte } = usePermission();

const cohorteId = computed(() => {
  const rawId = route.params['id'];
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
});

const cohorte = ref<CohorteFull | null>(null);
const isLoadingPage = ref(true);

// ─── Formulaire ───────────────────────────────────────────────────────────────

const form = useForm({
  validationSchema: toTypedSchema(cohorteUpdateSchema),
});

onMounted(async () => {
  if (!canManageCohorte()) {
    await navigateTo('/cohortes');
    return;
  }

  isLoadingPage.value = true;
  try {
    cohorte.value = await getCohorte(cohorteId.value);

    if (cohorte.value.status !== 'DRAFT') {
      // Cohorte non modifiable → rediriger vers le détail
      await navigateTo(`/cohortes/${cohorteId.value}`);
      return;
    }

    useSeoMeta({ title: `Modifier ${cohorte.value.name} — Cursus` });

    // Pré-remplir le formulaire
    const startStr = new Date(cohorte.value.startDate).toISOString().split('T')[0] ?? '';
    const endStr = new Date(cohorte.value.endDate).toISOString().split('T')[0] ?? '';
    form.setValues({
      name: cohorte.value.name,
      startDate: startStr,
      endDate: endStr,
      rhythm: cohorte.value.rhythm,
    });
  } catch {
    toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
    await navigateTo('/cohortes');
  } finally {
    isLoadingPage.value = false;
  }
});

const rhythmOptions = [
  { label: t('cohortes.rhythmLabel.WEEKLY'), value: 'WEEKLY' },
  { label: t('cohortes.rhythmLabel.BIWEEKLY'), value: 'BIWEEKLY' },
  { label: t('cohortes.rhythmLabel.MONTHLY'), value: 'MONTHLY' },
  { label: t('cohortes.rhythmLabel.CUSTOM'), value: 'CUSTOM' },
];

const onSubmit = form.handleSubmit(async (values) => {
  try {
    await updateCohorte(cohorteId.value, values as CohorteUpdateInput);
    toast.add({
      title: t('cohortes.saveSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
    await navigateTo(`/cohortes/${cohorteId.value}`);
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
      :items="[
        { label: t('cohortes.title'), to: '/cohortes' },
        { label: cohorte?.name ?? '…', to: `/cohortes/${cohorteId}` },
        { label: t('cohortes.edit') },
      ]"
      class="mb-6"
    />

    <!-- Skeleton -->
    <div v-if="isLoadingPage" class="space-y-4">
      <div class="skeleton h-10 w-48 rounded" />
      <div class="skeleton h-64 rounded-lg" />
    </div>

    <template v-else-if="cohorte">
      <div class="mb-8">
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('cohortes.edit') }}
        </h1>
        <p class="mt-1 text-sm text-text-muted">{{ cohorte.name }}</p>
      </div>

      <UCard class="border border-border-subtle bg-surface">
        <form novalidate class="space-y-6" @submit="onSubmit">
          <!-- Nom -->
          <UFormField :label="t('cohortes.name')" name="name" required>
            <UInput
              id="name"
              name="name"
              type="text"
              class="w-full"
              :model-value="form.values.name ?? ''"
              @update:model-value="form.setFieldValue('name', $event as string)"
              @blur="form.validateField('name')"
            />
          </UFormField>

          <!-- Dates -->
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
              :disabled="loading"
            >
              {{ t('common.save') }}
            </UButton>
            <UButton
              type="button"
              :to="`/cohortes/${cohorteId}`"
              color="neutral"
              variant="ghost"
              :disabled="loading"
            >
              {{ t('common.cancel') }}
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </div>
</template>
