<script setup lang="ts">
// Layout centré pour les pages d'authentification (login, signup, forgot, reset).
// Pas de navigation — l'utilisateur n'est pas encore authentifié.
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-12">
    <a
      href="#main"
      class="sr-only z-50 bg-accent px-4 py-2 text-text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md"
    >
      Aller au contenu
    </a>

    <!-- Logo -->
    <div class="mb-8 text-center">
      <NuxtLink to="/" class="inline-flex items-center gap-2 text-accent-text hover:opacity-80">
        <UIcon name="i-tabler-shield-check" class="size-7 text-accent" />
        <span class="text-xl font-semibold text-text-strong">Cursus</span>
      </NuxtLink>
    </div>

    <!-- Carte de formulaire -->
    <main
      id="main"
      class="w-full max-w-md rounded-xl border border-border-subtle bg-surface p-8 shadow-md"
    >
      <slot />
    </main>

    <!-- Footer minimaliste -->
    <p class="mt-8 text-xs text-text-subtle">
      &copy; {{ new Date().getFullYear() }} Cursus. Tous droits réservés.
    </p>
  </div>
</template>
