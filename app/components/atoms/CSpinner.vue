<script setup lang="ts">
/**
 * CSpinner — atome indicateur de chargement (standalone).
 * Accessible : aria-label obligatoire, rôle status.
 * Design tokens : text-accent (défaut), tailles sm/md/lg.
 * Respecte prefers-reduced-motion (animation désactivée via CSS global).
 */

interface Props {
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};
</script>

<template>
  <span role="status" :aria-label="props.ariaLabel" class="inline-flex items-center justify-center">
    <span
      :class="['i-tabler-loader-2 animate-spin text-accent', sizeClasses[props.size ?? 'md']]"
      aria-hidden="true"
    />
  </span>
</template>
