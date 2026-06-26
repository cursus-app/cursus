<script setup lang="ts">
/**
 * CSwitch — atome interrupteur bascule (sans dépendances @nuxt/ui).
 * Supporte label, description, disabled et v-model (boolean).
 * Design tokens : bg-accent, bg-muted, text-text-default, text-text-muted.
 */

interface Props {
  modelValue?: boolean;
  label?: string | null;
  description?: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: null,
  description: null,
  disabled: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const switchId = Math.random().toString(36).slice(2, 9);
const labelId = `switch-label-${switchId}`;

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
}
</script>

<template>
  <div class="flex items-start gap-3">
    <button
      type="button"
      role="switch"
      :aria-checked="props.modelValue"
      :aria-labelledby="props.label ? labelId : undefined"
      :aria-label="!props.label ? 'Toggle' : undefined"
      :disabled="props.disabled"
      :class="[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'duration-fast transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.modelValue ? 'bg-accent' : 'bg-muted',
      ]"
      @click="toggle"
    >
      <span
        aria-hidden="true"
        :class="[
          'pointer-events-none inline-block size-5 rounded-full bg-surface shadow-sm',
          'duration-fast ring-0 transition-transform',
          props.modelValue ? 'translate-x-5' : 'translate-x-0',
        ]"
      />
    </button>
    <div v-if="props.label || props.description" class="flex flex-col gap-0.5">
      <span v-if="props.label" :id="labelId" class="text-sm font-medium text-text-default">
        {{ props.label }}
      </span>
      <span v-if="props.description" class="text-xs text-text-muted">
        {{ props.description }}
      </span>
    </div>
  </div>
</template>
