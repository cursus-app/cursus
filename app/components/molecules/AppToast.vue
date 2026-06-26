<script setup lang="ts">
/**
 * AppToast — composant provider du système de toasts.
 *
 * Rend le <UToaster /> de @nuxt/ui configuré avec :
 *   - position bottom-right
 *   - queue max 3 toasts simultanés
 *   - aria-live="polite" (natif via UToaster)
 *
 * Usage :
 *   1. Placer <AppToast /> une seule fois dans app.vue (ou le layout root).
 *   2. Utiliser `useAppToast()` depuis les pages/composants pour émettre des toasts.
 *
 * Le composable useAppToast() est défini dans app/composables/useAppToast.ts
 * et wraps useToast() avec un limite de 3 toasts simultanés.
 */

/** Limite de toasts simultanément visibles. */
const MAX_QUEUE = 3 as const;

/** La position est configurée directement sur UToaster. */
defineExpose({ MAX_QUEUE });
</script>

<template>
  <!--
    UToaster = composant natif @nuxt/ui qui gère l'aria-live.
    position="bottom-right" + :ui override pour limiter la queue.
  -->
  <UToaster
    position="bottom-right"
    :toast-options="{ duration: 5000 }"
    :ui="{
      viewport: 'fixed right-4 bottom-4 z-50 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]',
    }"
  />
</template>
