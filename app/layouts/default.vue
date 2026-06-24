<script setup lang="ts">
// Layout par défaut — minimaliste, sera étoffé en EP-14/15 (atomic design).
// Layouts spécialisés (stagiaire, formateur, public, auth) viendront après.
// ST-15.5 : CookieNoticeBanner injecté ici pour couvrir toutes les pages.
</script>

<template>
  <div class="flex min-h-screen flex-col bg-app text-text-default">
    <a
      href="#main"
      class="sr-only z-50 bg-accent px-4 py-2 text-text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
    >
      Aller au contenu
    </a>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <!-- Bandeau d'information cookies (ePrivacy + RGPD) — ST-15.5 -->
    <MoleculesCookieNoticeBanner />
  </div>
</template>
