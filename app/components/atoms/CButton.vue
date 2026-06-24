<script setup lang="ts">
/**
 * CButton — atome bouton pur (sans dépendances @nuxt/ui).
 * Utilisé dans Storybook et partout où UButton ne convient pas (cas rares).
 * Design tokens uniquement : bg-accent, bg-surface, bg-muted, bg-danger-solid…
 */

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

const {
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
} = defineProps<Props>();

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-accent text-text-on-accent hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'bg-surface border border-border-subtle text-text-default hover:bg-muted active:bg-muted',
  ghost: 'text-text-default hover:bg-muted active:bg-muted',
  danger: 'bg-danger-solid text-text-on-accent hover:bg-danger-solid/90',
};
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      'disabled:pointer-events-none disabled:opacity-50',
      sizeClasses[size],
      variantClasses[variant],
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="i-tabler-loader-2 mr-2 size-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
