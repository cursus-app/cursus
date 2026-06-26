<script setup lang="ts">
/**
 * CTextarea — atome zone de texte (sans dépendances @nuxt/ui).
 * Supporte label, placeholder, error, disabled, rows et v-model.
 * Design tokens : bg-surface, border-border-subtle, text-text-default,
 *   text-text-subtle (placeholder), border-danger-solid (erreur).
 *
 * Note sur les types : voir CInput.vue — même convention `string | null`.
 */

interface Props {
  modelValue?: string | null;
  label?: string | null;
  placeholder?: string | null;
  error?: string | null;
  disabled?: boolean;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: null,
  placeholder: null,
  error: null,
  disabled: false,
  rows: 4,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const instanceId = Math.random().toString(36).slice(2, 9);
const errorId = `textarea-error-${instanceId}`;
const inputId = `textarea-input-${instanceId}`;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" :for="inputId" class="text-sm font-medium text-text-strong">
      {{ props.label }}
    </label>
    <textarea
      :id="inputId"
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder ?? undefined"
      :disabled="props.disabled"
      :rows="props.rows"
      :aria-invalid="!!props.error"
      :aria-describedby="props.error ? errorId : undefined"
      :class="[
        'flex w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-default',
        'resize-y transition-colors placeholder:text-text-subtle',
        'focus:ring-2 focus:ring-ring focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.error
          ? 'border-danger-solid focus:ring-danger-solid/20'
          : 'border-border-subtle hover:border-border-default',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="props.error" :id="errorId" role="alert" class="text-xs text-danger-fg">
      {{ props.error }}
    </p>
  </div>
</template>
