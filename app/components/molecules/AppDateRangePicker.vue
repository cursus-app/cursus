<script setup lang="ts">
/**
 * AppDateRangePicker — sélecteur de plage de dates.
 *
 * Deux UInput[type=date] avec validation des bornes :
 *   - La date de fin doit être ≥ la date de début
 *   - Les dates sont manipulées en local (YYYY-MM-DD), converties en UTC pour l'API
 *
 * v-model reçoit un objet { start: string | null; end: string | null }.
 *
 * Accessibilité :
 *   - Labels liés aux inputs via for/id
 *   - Message d'erreur avec aria-describedby + aria-invalid
 *   - role="group" sur le conteneur avec aria-label
 */

export interface DateRange {
  start: string | null;
  end: string | null;
}

interface Props {
  modelValue?: DateRange;
  /** Borne min (YYYY-MM-DD) pour la date de début. */
  min?: string | null;
  /** Borne max (YYYY-MM-DD) pour la date de fin. */
  max?: string | null;
  /** Label du groupe (accessibilité). */
  label?: string | null;
  /** Désactiver les deux champs. */
  disabled?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ start: null, end: null }),
  min: null,
  max: null,
  label: null,
  disabled: false,
  class: '',
});

const emit = defineEmits<{ 'update:modelValue': [range: DateRange] }>();

const { t } = useI18n();

const instanceId = Math.random().toString(36).slice(2, 9);
const startId = `date-start-${instanceId}`;
const endId = `date-end-${instanceId}`;
const errorId = `date-error-${instanceId}`;

const startValue = computed({
  get: () => props.modelValue.start ?? '',
  set: (v) => {
    const range: DateRange = { start: v || null, end: props.modelValue.end };
    // Si la fin est avant le début, réinitialiser la fin
    if (range.start && range.end && range.end < range.start) {
      range.end = null;
    }
    emit('update:modelValue', range);
  },
});

const endValue = computed({
  get: () => props.modelValue.end ?? '',
  set: (v) => {
    emit('update:modelValue', { start: props.modelValue.start, end: v || null });
  },
});

/** Validation des bornes. */
const endError = computed<string | null>(() => {
  const { start, end } = props.modelValue;
  if (start && end && end < start) {
    return t('molecules.dateRangePicker.errorEndBeforeStart');
  }
  return null;
});

/** La date de fin ne peut pas être avant le début. */
const endMin = computed(() => props.modelValue.start ?? props.min ?? undefined);
</script>

<template>
  <div
    role="group"
    :aria-label="props.label ?? t('molecules.dateRangePicker.startDate')"
    :class="['flex flex-col gap-3', props.class]"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
      <!-- Date de début -->
      <div class="flex flex-1 flex-col gap-1.5">
        <label :for="startId" class="text-sm font-medium text-text-strong">
          {{ t('molecules.dateRangePicker.startDate') }}
        </label>
        <UInput
          :id="startId"
          v-model="startValue"
          type="date"
          :min="props.min ?? undefined"
          :max="props.max ?? undefined"
          :disabled="props.disabled"
          class="w-full"
        />
      </div>

      <!-- Séparateur -->
      <div class="flex items-center pt-6 text-text-muted sm:pt-7">
        <span class="i-tabler-arrow-right size-4" aria-hidden="true" />
      </div>

      <!-- Date de fin -->
      <div class="flex flex-1 flex-col gap-1.5">
        <label :for="endId" class="text-sm font-medium text-text-strong">
          {{ t('molecules.dateRangePicker.endDate') }}
        </label>
        <UInput
          :id="endId"
          v-model="endValue"
          type="date"
          :min="endMin"
          :max="props.max ?? undefined"
          :disabled="props.disabled"
          :aria-invalid="!!endError"
          :aria-describedby="endError ? errorId : undefined"
          class="w-full"
          :ui="endError ? { base: 'border-danger-solid focus:ring-danger-solid/20' } : {}"
        />
      </div>
    </div>

    <!-- Message d'erreur -->
    <p v-if="endError" :id="errorId" role="alert" class="text-xs text-danger-fg">
      {{ endError }}
    </p>
  </div>
</template>
