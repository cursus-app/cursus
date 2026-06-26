<script setup lang="ts">
/**
 * CIcon — atome icône Tabler (sans dépendances @nuxt/ui).
 * Wrapper léger autour d'une span avec classe `i-tabler-*`.
 *
 * ⚠️ name doit toujours être un i-tabler-* (Tabler outline uniquement).
 * color : classe Tailwind text-* du design system (ex: 'text-accent',
 *   'text-text-muted') ou 'inherit' pour hériter du parent.
 */

interface Props {
  name: string;
  size?: 16 | 20 | 24;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 20,
  color: 'inherit',
});

const sizeMap: Record<number, string> = {
  16: 'size-4',
  20: 'size-5',
  24: 'size-6',
};
</script>

<template>
  <span
    :class="[
      props.name,
      sizeMap[props.size ?? 20] ?? 'size-5',
      'inline-block shrink-0',
      props.color !== 'inherit' ? props.color : '',
    ]"
    aria-hidden="true"
    v-bind="$attrs"
  />
</template>
