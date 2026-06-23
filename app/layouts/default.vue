<script setup lang="ts">
// Layout par défaut — minimaliste, sera étoffé en EP-14/15 (atomic design).
// Layouts spécialisés (stagiaire, formateur, public, auth) viendront après.
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg-base text-text-base">
    <a
      href="#main"
      class="sr-only z-50 bg-accent-600 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
    >
      Aller au contenu
    </a>

    <main id="main" class="flex-1">
      <slot />
    </main>
  </div>
</template>
