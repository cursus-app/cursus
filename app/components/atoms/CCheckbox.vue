<script setup lang="ts">
/**
 * CCheckbox — atome case à cocher (sans dépendances @nuxt/ui).
 * Supporte label, description, error, disabled, indeterminate et v-model (boolean).
 * Design tokens : bg-accent, border-border-subtle, text-text-default, text-danger-fg.
 *
 * Le <label> enveloppe directement l'input + le texte (même pattern que CRadio),
 * ce qui supprime le besoin d'association explicite for/id.
 */

interface Props {
  modelValue?: boolean;
  label?: string | null;
  description?: string | null;
  error?: string | null;
  disabled?: boolean;
  indeterminate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: null,
  description: null,
  error: null,
  disabled: false,
  indeterminate: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const instanceId = Math.random().toString(36).slice(2, 9);
const errorId = `checkbox-error-${instanceId}`;

function handleChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label
      class="flex items-start gap-2.5"
      :class="props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
    >
      <div class="relative flex h-5 items-center">
        <input
          type="checkbox"
          :checked="props.modelValue"
          :disabled="props.disabled"
          :indeterminate="props.indeterminate"
          :aria-invalid="!!props.error"
          :aria-describedby="props.error ? errorId : undefined"
          :class="[
            'size-4 rounded border transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            props.error ? 'border-danger-solid' : 'border-border-default',
            'accent-accent',
          ]"
          @change="handleChange"
        />
      </div>
      <div v-if="props.label || props.description" class="flex flex-col gap-0.5">
        <span v-if="props.label" class="text-sm font-medium text-text-default">
          {{ props.label }}
        </span>
        <span v-if="props.description" class="text-xs text-text-muted">
          {{ props.description }}
        </span>
      </div>
    </label>
    <p v-if="props.error" :id="errorId" role="alert" class="text-xs text-danger-fg">
      {{ props.error }}
    </p>
  </div>
</template>
