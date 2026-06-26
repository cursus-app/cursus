<script setup lang="ts">
// Layout par défaut — minimaliste, sera étoffé en EP-14/15 (atomic design).
// Layouts spécialisés (stagiaire, formateur, public, auth) viendront après.
// ST-15.5 : CookieNoticeBanner injecté ici pour couvrir toutes les pages.
// ST-18.5 : ThemeToggle dans la barre de navigation.
const { t } = useI18n();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-app text-text-default">
    <a
      href="#main"
      class="sr-only z-50 bg-accent px-4 py-2 text-text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
    >
      {{ t('nav.skipToContent') }}
    </a>

    <!-- Barre supérieure minimale — navigation complète dans EP-14 -->
    <header class="sticky top-0 z-40 border-b border-border-subtle bg-surface/80 backdrop-blur-sm">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <NuxtLink to="/" class="text-base font-semibold text-text-strong">
          {{ t('app.name') }}
        </NuxtLink>
        <AtomsThemeToggle />
      </div>
    </header>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <!-- Bandeau d'information cookies (ePrivacy + RGPD) — ST-15.5 -->
    <MoleculesCookieNoticeBanner />
  </div>
</template>
