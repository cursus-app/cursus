<script setup lang="ts">
/**
 * CInput — atome champ texte pur (sans dépendances @nuxt/ui).
 * Supporte label, placeholder, error, disabled et v-model.
 * Design tokens : bg-surface, border-border-subtle, text-text-default,
 *   text-text-subtle (placeholder), border-danger-solid (erreur).
 *
 * Note sur les types : les props string utilisent `string | null` (pas `?:string`)
 * pour contourner le conflit entre `exactOptionalPropertyTypes` et `withDefaults`.
 * `null` est la valeur sentinelle « non fournie » ; on la convertit en undefined
 * dans le template via `?? undefined` quand nécessaire (ex. placeholder).
 */

interface Props {
  modelValue?: string | null;
  placeholder?: string | null;
  disabled?: boolean;
  error?: string | null;
  label?: string | null;
  type?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  modelValue: null,
  placeholder: null,
  error: null,
  label: null,
  disabled: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" class="text-sm font-medium text-text-strong">
      {{ props.label }}
    </label>
    <input
      :type="props.type"
      :value="props.modelValue ?? ''"
      :placeholder="props.placeholder ?? undefined"
      :disabled="props.disabled"
      :aria-invalid="!!props.error"
      :aria-describedby="props.error ? 'input-error' : undefined"
      :class="[
        'flex w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-default',
        'transition-colors placeholder:text-text-subtle',
        'focus:ring-2 focus:ring-ring focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.error
          ? 'border-danger-solid focus:ring-danger-solid/20'
          : 'border-border-subtle hover:border-border-default',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <p v-if="props.error" id="input-error" role="alert" class="text-xs text-danger-fg">
      {{ props.error }}
    </p>
  </div>
</template>
