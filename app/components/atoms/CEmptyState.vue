<script setup lang="ts">
/**
 * CEmptyState — atome état vide pur (sans dépendances @nuxt/ui).
 * Icône Tabler + titre + description optionnelle + slot actions.
 * Utilisé partout où une liste/table est vide.
 */

interface Props {
  icon?: string
  title: string
  description?: string
}

const {
  icon = 'i-tabler-inbox',
  title,
  description = undefined,
} = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div
      :class="[icon, 'size-12 text-text-muted']"
      aria-hidden="true"
    />
    <div>
      <p class="font-semibold text-text-strong">{{ title }}</p>
      <p
        v-if="description"
        class="mt-1 text-sm text-text-muted"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>
