<script setup lang="ts">
// Page d'erreur Nuxt — affichée pour 404, 500, etc.
// Cf. 10-design-system §3.2 (error states règle).
import type { NuxtError } from '#app';

const props = defineProps<{
  error: NuxtError;
}>();

const isNotFound = computed(() => props.error.statusCode === 404);

const title = computed(() =>
  isNotFound.value ? 'Page introuvable' : "Quelque chose s'est mal passé",
);

const message = computed(() =>
  isNotFound.value
    ? "Cette page n'existe pas ou a été déplacée."
    : "Une erreur inattendue est survenue. L'équipe a été notifiée.",
);

// ID Sentry abrégé pour le support (cf. 10-design-system §3.2)
const supportRef = computed(() => {
  const id = (props.error as { sentryEventId?: string }).sentryEventId;
  return id ? id.slice(0, 8) : null;
});

// Composables appelés dans le setup (pas dans les handlers, sinon « composable
// called outside of setup »). On capture le chemin courant pour le « Réessayer ».
const route = useRoute();

function handleHome(): void {
  clearError({ redirect: '/' });
}

function handleRetry(): void {
  clearError({ redirect: route.fullPath });
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 py-16">
    <div class="w-full max-w-md text-center">
      <p class="text-sm font-medium tracking-wider text-text-subtle uppercase">
        Erreur {{ error.statusCode }}
      </p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-text-base">
        {{ title }}
      </h1>
      <p class="mt-4 text-base text-text-muted">
        {{ message }}
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <UButton color="primary" size="lg" @click="handleRetry">Réessayer</UButton>
        <UButton variant="outline" size="lg" @click="handleHome">Retour à l'accueil</UButton>
      </div>

      <p v-if="supportRef" class="mt-8 font-mono text-xs text-text-subtle">
        Référence support : {{ supportRef }}
      </p>
    </div>
  </div>
</template>
