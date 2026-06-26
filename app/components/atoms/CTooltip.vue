<script setup lang="ts">
/**
 * CTooltip — atome infobulle (standalone, CSS uniquement).
 * Enveloppe son slot et affiche une bulle au survol/focus.
 * Design tokens : bg-surface, border-border-subtle, text-text-default, shadow-sm.
 * Placement : top | bottom | left | right.
 */

interface Props {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
});

const placementClasses: Record<NonNullable<Props['placement']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};
</script>

<template>
  <div class="group relative inline-flex">
    <slot />
    <div
      role="tooltip"
      :class="[
        'pointer-events-none absolute z-50 w-max max-w-xs',
        'rounded-lg border border-border-subtle bg-surface px-3 py-1.5 shadow-sm',
        'text-xs text-text-default',
        'duration-fast opacity-0 transition-opacity',
        'group-focus-within:opacity-100 group-hover:opacity-100',
        placementClasses[props.placement ?? 'top'],
      ]"
    >
      {{ props.text }}
    </div>
  </div>
</template>
