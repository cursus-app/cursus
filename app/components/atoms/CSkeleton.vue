<script setup lang="ts">
/**
 * CSkeleton — atome squelette de chargement (standalone).
 * Utilise l'utilitaire `.skeleton` défini dans assets/css/main.css.
 * Props : width, height, rounded (pill shape), class (passthrough).
 */

interface Props {
  width?: string | number | null;
  height?: string | number | null;
  rounded?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: null,
  height: null,
  rounded: false,
  class: '',
});

function toPixels(value: string | number | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value;
}
</script>

<template>
  <div
    :class="['skeleton', props.rounded ? 'rounded-full' : 'rounded-md', props.class ?? '']"
    :style="{
      width: toPixels(props.width) ?? undefined,
      height: toPixels(props.height) ?? undefined,
    }"
    aria-hidden="true"
  />
</template>
