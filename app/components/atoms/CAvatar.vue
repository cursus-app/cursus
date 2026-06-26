<script setup lang="ts">
/**
 * CAvatar — atome avatar utilisateur (sans dépendances @nuxt/ui).
 * Affiche une image ou les initiales du nom en fallback.
 * Design tokens : bg-accent, text-text-on-accent.
 */

interface Props {
  src?: string | null;
  alt?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  alt: null,
  name: null,
  size: 'md',
});

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  xs: 'size-6 text-xs',
  sm: 'size-8 text-sm',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
};

function getInitials(name: string | null): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
</script>

<template>
  <div
    :class="[
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
      sizeClasses[props.size ?? 'md'],
    ]"
  >
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt ?? props.name ?? ''"
      class="size-full object-cover"
    />
    <span
      v-else
      class="flex size-full items-center justify-center bg-accent font-medium text-text-on-accent"
    >
      {{ getInitials(props.name) }}
    </span>
  </div>
</template>
