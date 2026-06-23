<script setup lang="ts">
// Racine de l'app. Nuxt va injecter NuxtPage dans le layout courant.
// Color mode auto-géré par @nuxt/ui (suit prefers-color-scheme + override user).

useHead({
  htmlAttrs: { lang: 'fr' },
});
</script>

<template>
  <NuxtLoadingIndicator color="var(--accent)" />
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
