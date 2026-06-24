<script setup lang="ts">
/**
 * CCard — atome carte pur (sans dépendances @nuxt/ui).
 * Fond bg-surface + bordure border-border-subtle + shadow-sm.
 * Options de padding : none | sm | md | lg.
 */

interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const { padding = 'md' } = defineProps<Props>();

const paddingClasses: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-border-subtle bg-surface shadow-sm',
      paddingClasses[padding],
    ]"
  >
    <slot />
  </div>
</template>
