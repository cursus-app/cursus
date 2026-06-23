<script setup lang="ts">
// Landing page minimaliste — placeholder MVP.
// Affiche un indicateur de santé qui ping /api/health côté server.
import type { HealthResponse } from '~~/shared/types/health';

useSeoMeta({
  title: 'Cursus',
  description: 'Gestion de parcours de stages tech — du onboarding au certificat.',
});

// `useFetch` renvoie déjà `Ref<HealthResponse | null>` (null tant que non chargé),
// donc pas de `default: () => null` (qui casse l'inférence du générique).
const {
  data: health,
  status,
  error,
  refresh,
} = await useFetch<HealthResponse>('/api/health', {
  key: 'health-check',
  // On veut savoir si la DB répond — donc pas de cache trop long.
  server: false,
  lazy: true,
});

const statusLabel = computed(() => {
  if (status.value === 'pending') {
    return 'Vérification…';
  }
  if (error.value) {
    return 'Erreur';
  }
  if (health.value?.ok) {
    return 'Opérationnel';
  }
  return 'Dégradé';
});

const statusColor = computed(() => {
  if (status.value === 'pending') {
    return 'bg-bg-muted text-text-muted';
  }
  if (error.value || !health.value?.ok) {
    return 'bg-danger-subtle text-danger-base';
  }
  return 'bg-success-subtle text-success-base';
});
</script>

<template>
  <section class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
    <p class="text-xs font-medium tracking-widest text-text-subtle uppercase">Cursus</p>

    <h1 class="mt-3 text-4xl font-semibold tracking-tight text-text-base sm:text-5xl">
      Le parcours de stage tech, structuré et validé.
    </h1>

    <p class="mt-6 text-lg leading-relaxed text-text-muted">
      Cursus accompagne stagiaires et formateurs du onboarding à la délivrance du certificat, avec
      validation automatique des livrables par un harnais GitHub Actions.
    </p>

    <div class="mt-10 flex items-center gap-4">
      <UButton to="/login" size="lg" color="primary">Se connecter</UButton>
      <UButton to="/about" variant="ghost" size="lg">En savoir plus</UButton>
    </div>

    <div class="mt-16 rounded-lg border border-border-subtle p-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">Statut système</p>
          <p class="mt-1 text-sm text-text-base">
            <span
              class="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="statusColor"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="health?.ok ? 'bg-success-base' : 'bg-danger-base'"
              />
              {{ statusLabel }}
            </span>
            <span v-if="health?.database?.latencyMs != null" class="ml-2 text-xs text-text-muted">
              DB {{ health.database.latencyMs }} ms
            </span>
          </p>
        </div>
        <UButton variant="ghost" size="sm" icon="i-tabler-refresh" @click="refresh()">
          Actualiser
        </UButton>
      </div>
    </div>
  </section>
</template>
