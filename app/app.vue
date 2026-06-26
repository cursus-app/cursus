<script setup lang="ts">
// Racine de l'app. Nuxt va injecter NuxtPage dans le layout courant.
// Color mode auto-géré par @nuxt/ui (suit prefers-color-scheme + override user).

useHead({
  htmlAttrs: { lang: 'fr' },
});

// Transition de page : fade 150ms.
// Désactivée si prefers-reduced-motion: reduce (accessibilité WCAG 2.3.3).
const reducedMotion = useReducedMotion();

const pageTransition = computed(() =>
  reducedMotion.value ? false : ({ name: 'page', mode: 'out-in' } as const),
);
</script>

<template>
  <NuxtLoadingIndicator color="var(--accent)" />
  <UApp>
    <NuxtLayout>
      <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
  </UApp>
</template>
