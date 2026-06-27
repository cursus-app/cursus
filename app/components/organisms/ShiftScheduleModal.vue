<script setup lang="ts">
/**
 * ShiftScheduleModal — modal de décalage de planning d'une cohorte.
 * Permet au formateur de décaler toutes les échéances de N jours avec aperçu.
 * Cf. ST-04.4 — Échéancier et décalage de planning.
 */

const props = defineProps<{
  open: boolean;
  cohorteId: string;
  cohorteName: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  shifted: [days: number];
}>();

const { t } = useI18n();
const toast = useToast();

// ─── Form state ───────────────────────────────────────────────────────────────

/** Input value as string to avoid UInput type constraint with null. */
const daysInput = ref('');
/** Parsed integer from daysInput, or null if empty/invalid. */
const days = computed<number | null>(() => {
  const n = parseInt(daysInput.value, 10);
  return Number.isFinite(n) ? n : null;
});
const reason = ref('');
const confirmed = ref(false);

const daysError = ref<string | null>(null);
const confirmError = ref<string | null>(null);
const isLoadingPreview = ref(false);
const isSubmitting = ref(false);

// ─── Preview state ────────────────────────────────────────────────────────────

interface PreviewItem {
  cohortModuleId: string;
  moduleId: string;
  week: number;
  title: string;
  currentDueDate: string;
  newDueDate: string;
}

const previewItems = ref<PreviewItem[]>([]);
const hasPreview = ref(false);

// ─── Computed helpers ─────────────────────────────────────────────────────────

const isBackwardShift = computed(() => (days.value ?? 0) < 0);

const isValid = computed(() => {
  const d = days.value;
  return typeof d === 'number' && Number.isInteger(d) && d !== 0 && d >= -30 && d <= 30;
});

// ─── Reset on open/close ──────────────────────────────────────────────────────

watch(
  () => props.open,
  (val) => {
    if (val) {
      daysInput.value = '';
      reason.value = '';
      confirmed.value = false;
      daysError.value = null;
      confirmError.value = null;
      previewItems.value = [];
      hasPreview.value = false;
    }
  },
);

// Reset preview when days changes
watch(daysInput, () => {
  hasPreview.value = false;
  previewItems.value = [];
  daysError.value = null;
});

// ─── Preview ──────────────────────────────────────────────────────────────────

async function loadPreview() {
  if (!isValid.value) {
    daysError.value = t('cohortes.schedule.errors.daysOutOfRange');
    return;
  }
  daysError.value = null;
  isLoadingPreview.value = true;
  hasPreview.value = false;
  try {
    const res = await $fetch<{ preview: boolean; days: number; items: PreviewItem[] }>(
      `/api/cohortes/${props.cohorteId}/shift-schedule`,
      { query: { days: days.value } },
    );
    previewItems.value = res.items;
    hasPreview.value = true;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isLoadingPreview.value = false;
  }
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function handleSubmit() {
  daysError.value = null;
  confirmError.value = null;

  if (!isValid.value) {
    daysError.value = t('cohortes.schedule.errors.daysOutOfRange');
    return;
  }

  if (isBackwardShift.value && !confirmed.value) {
    confirmError.value = t('cohortes.schedule.errors.confirmRequired');
    return;
  }

  isSubmitting.value = true;
  try {
    const body: Record<string, unknown> = {
      days: days.value,
      preview: false,
      confirmed: confirmed.value,
    };
    if (reason.value.trim().length > 0) {
      body['reason'] = reason.value.trim();
    }

    await $fetch(`/api/cohortes/${props.cohorteId}/shift-schedule`, {
      method: 'POST',
      body,
    });

    toast.add({
      title: t('cohortes.schedule.success', { days: days.value }),
      color: 'success',
      icon: 'i-tabler-calendar-check',
    });

    emit('shifted', days.value ?? 0);
    emit('update:open', false);
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isSubmitting.value = false;
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)">
    <template #content>
      <div class="p-6">
        <h3 class="mb-1 text-lg font-semibold text-text-strong">
          {{ t('cohortes.schedule.modalTitle') }}
        </h3>
        <p class="mb-6 text-sm text-text-muted">
          {{ t('cohortes.schedule.modalDescription', { name: cohorteName }) }}
        </p>

        <!-- Nombre de jours -->
        <div class="mb-4">
          <label for="shift-days" class="mb-1 block text-sm font-medium text-text-strong">
            {{ t('cohortes.schedule.daysLabel') }}
          </label>
          <div class="flex gap-2">
            <UInput
              id="shift-days"
              v-model="daysInput"
              type="number"
              :min="-30"
              :max="30"
              :placeholder="t('cohortes.schedule.daysPlaceholder')"
              :status="daysError ? 'error' : undefined"
              class="flex-1"
              @keydown.enter="loadPreview"
            />
            <UButton
              icon="i-tabler-eye"
              color="neutral"
              variant="outline"
              :loading="isLoadingPreview"
              :disabled="!isValid"
              @click="loadPreview"
            >
              {{ t('cohortes.schedule.previewButton') }}
            </UButton>
          </div>
          <p v-if="daysError" class="mt-1 text-xs text-danger-fg" role="alert">
            {{ daysError }}
          </p>
          <p class="mt-1 text-xs text-text-subtle">
            {{ t('cohortes.schedule.daysHint') }}
          </p>
        </div>

        <!-- Raison (optionnelle) -->
        <div class="mb-4">
          <label for="shift-reason" class="mb-1 block text-sm font-medium text-text-strong">
            {{ t('cohortes.schedule.reasonLabel') }}
          </label>
          <UInput
            id="shift-reason"
            v-model="reason"
            type="text"
            :placeholder="t('cohortes.schedule.reasonPlaceholder')"
            maxlength="500"
          />
        </div>

        <!-- Avertissement décalage en arrière -->
        <div
          v-if="isBackwardShift"
          class="mb-4 flex items-start gap-3 rounded-lg border border-border-subtle bg-warning-bg px-4 py-3"
          role="alert"
        >
          <UIcon name="i-tabler-alert-triangle" class="mt-0.5 size-5 shrink-0 text-warning-fg" />
          <div>
            <p class="text-sm font-medium text-warning-fg">
              {{ t('cohortes.schedule.warningBackward') }}
            </p>
            <div class="mt-2 flex items-center gap-2">
              <input id="shift-confirm" v-model="confirmed" type="checkbox" class="accent-accent" />
              <label for="shift-confirm" class="cursor-pointer text-sm text-text-default">
                {{ t('cohortes.schedule.confirmWarning') }}
              </label>
            </div>
            <p v-if="confirmError" class="mt-1 text-xs text-danger-fg" role="alert">
              {{ confirmError }}
            </p>
          </div>
        </div>

        <!-- Aperçu du nouveau planning -->
        <div v-if="hasPreview" class="mb-4">
          <h4 class="mb-2 text-sm font-semibold text-text-strong">
            {{ t('cohortes.schedule.previewTitle') }}
          </h4>

          <div v-if="previewItems.length === 0" class="py-4 text-center text-sm text-text-muted">
            {{ t('cohortes.schedule.previewEmpty') }}
          </div>

          <div v-else class="max-h-56 overflow-y-auto rounded-lg border border-border-subtle">
            <table class="w-full text-sm" role="table">
              <caption class="sr-only">
                {{
                  t('cohortes.schedule.previewTitle')
                }}
              </caption>
              <thead class="sticky top-0 bg-muted">
                <tr>
                  <th scope="col" class="px-3 py-2 text-left text-xs text-text-subtle">
                    {{ t('cohortes.schedule.previewModule') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-left text-xs text-text-subtle">
                    {{ t('cohortes.schedule.previewCurrentDate') }}
                  </th>
                  <th scope="col" class="px-3 py-2 text-left text-xs text-text-subtle">
                    {{ t('cohortes.schedule.previewNewDate') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle bg-surface">
                <tr v-for="item in previewItems" :key="item.cohortModuleId">
                  <td class="px-3 py-2 text-text-default">
                    <span class="text-text-muted">S{{ item.week }}</span>
                    {{ item.title }}
                  </td>
                  <td class="px-3 py-2 text-text-muted">
                    {{ formatDate(item.currentDueDate) }}
                  </td>
                  <td class="px-3 py-2 font-medium text-text-strong">
                    {{ formatDate(item.newDueDate) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="isSubmitting"
            @click="$emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            icon="i-tabler-calendar-event"
            color="primary"
            :loading="isSubmitting"
            :disabled="!isValid || (isBackwardShift && !confirmed)"
            @click="handleSubmit"
          >
            {{ t('cohortes.schedule.confirmButton') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
