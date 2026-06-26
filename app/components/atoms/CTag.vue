<script setup lang="ts">
/**
 * CTag — atome chip/tag (sans dépendances @nuxt/ui).
 * Variantes statut : default | info | success | warning | danger.
 * Optionnellement supprimable (bouton remove avec i-tabler-x).
 * Design tokens : bg-muted, bg-info-bg/text-info-fg, bg-success-bg/text-success-fg, etc.
 */

interface Props {
  label: string;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  removable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  removable: false,
});

const emit = defineEmits<{ remove: [] }>();

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-muted text-text-default',
  info: 'bg-info-bg text-info-fg',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
};

const removeButtonClasses: Record<NonNullable<Props['variant']>, string> = {
  default: 'hover:bg-muted',
  info: 'hover:bg-info-fg/10',
  success: 'hover:bg-success-fg/10',
  warning: 'hover:bg-warning-fg/10',
  danger: 'hover:bg-danger-fg/10',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variantClasses[props.variant ?? 'default'],
    ]"
  >
    {{ props.label }}
    <button
      v-if="props.removable"
      type="button"
      :aria-label="`Supprimer ${props.label}`"
      :class="[
        'inline-flex size-3.5 items-center justify-center rounded-full transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        removeButtonClasses[props.variant ?? 'default'],
      ]"
      @click="emit('remove')"
    >
      <span class="i-tabler-x size-3" aria-hidden="true" />
    </button>
  </span>
</template>
