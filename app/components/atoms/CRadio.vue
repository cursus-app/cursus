<script setup lang="ts">
/**
 * CRadio — atome groupe de boutons radio (sans dépendances @nuxt/ui).
 * Supporte label, options, error, disabled et v-model.
 * Design tokens : border-border-default, text-text-default, text-danger-fg.
 */

interface RadioOption {
  label: string;
  value: string;
}

interface Props {
  modelValue?: string | null;
  options?: RadioOption[];
  label?: string | null;
  error?: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  label: null,
  error: null,
  disabled: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const groupName = `radio-group-${Math.random().toString(36).slice(2, 9)}`;
</script>

<template>
  <fieldset class="flex flex-col gap-1.5">
    <legend v-if="props.label" class="text-sm font-medium text-text-strong">
      {{ props.label }}
    </legend>
    <div
      class="flex flex-col gap-2"
      role="radiogroup"
      :aria-invalid="!!props.error"
      :aria-describedby="props.error ? 'radio-error' : undefined"
    >
      <label
        v-for="option in props.options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-2.5"
        :class="props.disabled ? 'cursor-not-allowed opacity-50' : ''"
      >
        <input
          type="radio"
          :name="groupName"
          :value="option.value"
          :checked="option.value === props.modelValue"
          :disabled="props.disabled"
          :class="[
            'size-4 border transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            'disabled:cursor-not-allowed',
            props.error ? 'border-danger-solid' : 'border-border-default',
            'accent-accent',
          ]"
          @change="emit('update:modelValue', option.value)"
        />
        <span class="text-sm text-text-default">{{ option.label }}</span>
      </label>
    </div>
    <p v-if="props.error" id="radio-error" role="alert" class="text-xs text-danger-fg">
      {{ props.error }}
    </p>
  </fieldset>
</template>
