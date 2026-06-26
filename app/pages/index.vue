<script setup lang="ts">
// Landing page minimaliste — placeholder MVP.
// Affiche un indicateur de santé qui ping /api/health côté server.
import type { HealthResponse } from '~~/shared/types/health';

const { t } = useI18n();

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
    return t('index.status.checking');
  }
  if (error.value) {
    return t('index.status.error');
  }
  if (health.value?.ok) {
    return t('index.status.ok');
  }
  return t('index.status.degraded');
});

const statusColor = computed(() => {
  if (status.value === 'pending') {
    return 'bg-muted text-text-muted';
  }
  if (error.value || !health.value?.ok) {
    return 'bg-danger-bg text-danger-fg';
  }
  return 'bg-success-bg text-success-fg';
});
</script>

<template>
  <section class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
    <p class="text-xs font-medium tracking-widest text-text-subtle uppercase">Cursus</p>

    <h1 class="mt-3 text-4xl font-semibold tracking-tight text-text-strong sm:text-5xl">
      {{ t('app.tagline') }}
    </h1>

    <p class="mt-6 text-lg leading-relaxed text-text-muted">
      {{ t('index.description') }}
    </p>

    <div class="mt-10 flex items-center gap-4">
      <UButton to="/login" size="lg" color="primary">{{ t('auth.login') }}</UButton>
      <UButton to="/about" variant="ghost" size="lg">{{ t('index.learnMore') }}</UButton>
    </div>

    <div class="mt-16 rounded-lg border border-border-subtle p-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
            {{ t('index.systemStatus') }}
          </p>
          <p class="mt-1 text-sm text-text-default">
            <span
              class="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="statusColor"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="health?.ok ? 'bg-success-solid' : 'bg-danger-solid'"
              />
              {{ statusLabel }}
            </span>
            <span v-if="health?.database?.latencyMs != null" class="ml-2 text-xs text-text-muted">
              DB {{ health.database.latencyMs }} ms
            </span>
          </p>
        </div>
        <UButton variant="ghost" size="sm" icon="i-tabler-refresh" @click="refresh()">
          {{ t('index.refresh') }}
        </UButton>
      </div>
    </div>
  </section>
</template>
