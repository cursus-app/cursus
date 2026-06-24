<script setup lang="ts">
/**
 * CBadge — atome badge statut pur (sans dépendances @nuxt/ui).
 * Variantes : default | success | warning | danger | info
 * Design tokens : bg-success-bg / text-success-fg, etc.
 */

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

const { variant = 'default', size = 'md' } = defineProps<Props>()

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-muted text-text-default',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium',
      sizeClasses[size],
      variantClasses[variant],
    ]"
  >
    <slot />
  </span>
</template>
