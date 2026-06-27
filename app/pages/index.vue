<script setup lang="ts">
/**
 * Dashboard stagiaire — page d'accueil (/).
 *
 * Sections :
 *   1. « Cette semaine » hero — module en cours + compte à rebours + CTA
 *   2. « Ma progression » — jauge cursus % + XP
 *   3. « XP & badges » — total XP + 3 derniers badges
 *   4. « Fil de la cohorte » — 3 derniers événements positifs
 *   5. « Prochaines échéances » — 3 prochains modules triés par dueDate
 *
 * Responsive : mobile = 1 col, desktop = 2 col (1+2 à gauche, 3+4+5 à droite).
 * Redirect : FORMATEUR_PRINCIPAL → /cohortes, ADMIN → /admin.
 *
 * ST-13.1
 */
import { useDashboard } from '~/composables/useDashboard';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();
const userStore = useUserStore();

// ── Redirections rôle ─────────────────────────────────────────────────────────
const role = computed(() => userStore.globalRole);

if (import.meta.server) {
  // SSR : redirect immédiate si rôle connu côté serveur
  if (role.value === 'FORMATEUR_PRINCIPAL' || role.value === 'CO_FORMATEUR') {
    await navigateTo('/cohortes');
  } else if (role.value === 'ADMIN') {
    // eslint-disable-next-line link-checker/valid-route, link-checker/valid-sitemap-link
    await navigateTo('/admin'); // /admin sera créé par ST-14.x
  }
}

// Côté client : le store peut être hydraté après le SSR
onMounted(() => {
  if (role.value === 'FORMATEUR_PRINCIPAL' || role.value === 'CO_FORMATEUR') {
    void navigateTo('/cohortes');
  } else if (role.value === 'ADMIN') {
    // eslint-disable-next-line link-checker/valid-route, link-checker/valid-sitemap-link
    void navigateTo('/admin'); // /admin sera créé par ST-14.x
  }
});

useSeoMeta({
  title: t('dashboard.seo.title'),
  description: t('dashboard.seo.description'),
});

// ── Données dashboard ─────────────────────────────────────────────────────────
const { data, isLoading } = useDashboard();

// Computed helpers
const progressLabel = computed(() => {
  if (!data.value) { return ''; }
  const { completedModules, totalModules } = data.value.progress;
  return t('dashboard.progress.label', { completed: completedModules, total: totalModules });
});
</script>

<template>
  <div class="min-h-screen bg-app">
    <!-- Skip link (a11y) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-text focus:outline-none"
    >
      {{ t('nav.skipToContent') }}
    </a>

    <main id="main-content" class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Titre de page (visible par les SR, masqué visuellement si déjà dans le hero) -->
      <h1 class="sr-only">{{ t('dashboard.title') }}</h1>

      <!-- Layout 2 colonnes desktop -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- ── Colonne gauche : Hero + Progression ──────────────────────────── -->
        <div class="space-y-6">
          <!-- Section 1 : Cette semaine (hero) -->
          <DashboardHero
            :data="data?.currentWeek ?? null"
            :is-loading="isLoading"
          />

          <!-- Section 2 : Ma progression -->
          <section
            class="rounded-xl border border-border-subtle bg-surface p-6"
            aria-labelledby="progression-heading"
          >
            <h2
              id="progression-heading"
              class="mb-4 text-sm font-semibold tracking-wide text-text-subtle uppercase"
            >
              {{ t('dashboard.progress.title') }}
            </h2>

            <!-- Skeleton -->
            <template v-if="isLoading">
              <CSkeleton class="mb-2 h-4 w-32" />
              <CSkeleton class="h-3 rounded-full" />
              <div class="mt-4 flex justify-between">
                <CSkeleton class="h-3 w-20" />
                <CSkeleton class="h-3 w-12" />
              </div>
            </template>

            <template v-else>
              <div class="mb-1 flex items-center justify-between">
                <p class="text-xs text-text-muted">{{ progressLabel }}</p>
                <p class="text-xs font-semibold text-text-strong">
                  {{ data?.progress.progressPct ?? 0 }} %
                </p>
              </div>
              <AppProgressBar
                :value="data?.progress.progressPct ?? 0"
                :max="100"
                size="md"
                :label="progressLabel"
              />

              <!-- XP total -->
              <div class="mt-4 flex items-center gap-2">
                <span class="i-tabler-bolt size-4 text-accent" aria-hidden="true" />
                <p class="text-sm text-text-default">
                  <span class="font-semibold text-text-strong">
                    {{ (data?.progress.xpTotal ?? 0).toLocaleString() }}
                  </span>
                  {{ t('dashboard.progress.xpTotal') }}
                </p>
              </div>
            </template>
          </section>
        </div>

        <!-- ── Colonne droite : XP/Badges + Feed + Échéances ──────────────── -->
        <div class="space-y-6">
          <!-- Section 3 : XP & badges -->
          <section
            class="rounded-xl border border-border-subtle bg-surface p-6"
            aria-labelledby="badges-heading"
          >
            <h2
              id="badges-heading"
              class="mb-4 text-sm font-semibold tracking-wide text-text-subtle uppercase"
            >
              {{ t('dashboard.badges.title') }}
            </h2>

            <!-- Skeleton -->
            <template v-if="isLoading">
              <div class="flex gap-3">
                <CSkeleton
                  v-for="i in 3"
                  :key="i"
                  class="size-12 rounded-lg"
                />
              </div>
            </template>

            <!-- État vide -->
            <template v-else-if="!data?.badges.total">
              <div class="flex items-center gap-3">
                <span class="i-tabler-award size-10 text-text-muted" aria-hidden="true" />
                <p class="text-sm text-text-muted">{{ t('dashboard.badges.empty') }}</p>
              </div>
            </template>

            <!-- Badges -->
            <template v-else>
              <p class="mb-3 text-sm text-text-muted">
                {{
                  t('dashboard.badges.total', {
                    n: data.badges.total,
                  })
                }}
              </p>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="badge in data.badges.last3"
                  :key="badge.id"
                  class="group relative"
                >
                  <!-- Badge icon ou fallback -->
                  <div
                    class="flex size-12 items-center justify-center rounded-lg bg-muted ring-1 ring-border-subtle transition-shadow group-hover:ring-accent"
                    :title="badge.name"
                  >
                    <img
                      v-if="badge.iconUrl"
                      :src="badge.iconUrl"
                      :alt="badge.name"
                      width="32"
                      height="32"
                      class="size-8 object-contain"
                    />
                    <span
                      v-else
                      class="i-tabler-award size-6 text-accent"
                      :aria-label="badge.name"
                      role="img"
                    />
                  </div>
                  <!-- Tooltip -->
                  <div
                    class="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-md bg-surface px-2 py-1 text-xs text-text-strong shadow-md ring-1 ring-border-subtle group-hover:block"
                    aria-hidden="true"
                  >
                    {{ badge.name }}
                  </div>
                </div>
              </div>
            </template>
          </section>

          <!-- Section 4 : Fil de la cohorte -->
          <div class="rounded-xl border border-border-subtle bg-surface p-6">
            <CohortFeed
              :feed="data?.feed ?? []"
              :is-loading="isLoading"
            />
          </div>

          <!-- Section 5 : Prochaines échéances -->
          <div class="rounded-xl border border-border-subtle bg-surface p-6">
            <DeadlineList
              :deadlines="data?.upcomingDeadlines ?? []"
              :is-loading="isLoading"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
