<script setup lang="ts">
/**
 * CSelect — atome liste déroulante (sans dépendances @nuxt/ui).
 * Supporte label, placeholder, error, disabled et v-model.
 * Design tokens : bg-surface, border-border-subtle, text-text-default, text-danger-fg.
 */

interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  modelValue?: string | null;
  options?: SelectOption[];
  label?: string | null;
  placeholder?: string | null;
  error?: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  label: null,
  placeholder: null,
  error: null,
  disabled: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const instanceId = Math.random().toString(36).slice(2, 9);
const errorId = `select-error-${instanceId}`;
const inputId = `select-input-${instanceId}`;
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" :for="inputId" class="text-sm font-medium text-text-strong">
      {{ props.label }}
    </label>
    <div class="relative">
      <select
        :id="inputId"
        :value="props.modelValue ?? ''"
        :disabled="props.disabled"
        :aria-invalid="!!props.error"
        :aria-describedby="props.error ? errorId : undefined"
        :class="[
          'flex w-full appearance-none rounded-lg border bg-surface px-3 py-2 pr-8 text-sm',
          'text-text-default transition-colors',
          'focus:ring-2 focus:ring-ring focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          props.error
            ? 'border-danger-solid focus:ring-danger-solid/20'
            : 'border-border-subtle hover:border-border-default',
          !props.modelValue ? 'text-text-subtle' : 'text-text-default',
        ]"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="props.placeholder" value="" disabled :selected="!props.modelValue">
          {{ props.placeholder }}
        </option>
        <option
          v-for="option in props.options"
          :key="option.value"
          :value="option.value"
          :selected="option.value === props.modelValue"
        >
          {{ option.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-text-subtle"
        aria-hidden="true"
      >
        <span class="i-tabler-chevron-down size-4" />
      </span>
    </div>
    <p v-if="props.error" :id="errorId" role="alert" class="text-xs text-danger-fg">
      {{ props.error }}
    </p>
  </div>
</template>
