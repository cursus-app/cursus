<script setup lang="ts">
/**
 * Page /cette-semaine — tableau de bord du stagiaire.
 * Cf. ST-05.1 — TT-05.1.1 à TT-05.1.5.
 *
 * Fonctionnalités :
 *  - Module de la semaine avec titre, numéro de semaine, statut
 *  - Compte à rebours (jours:heures:min) avec aria-live="polite"
 *  - Bandeau "en retard" si dueDate dépassée et non soumis
 *  - Liste des ressources avec type et lien
 *  - Section livrable (champ URL GitHub + bouton soumission placeholder)
 *  - CTA quiz si quiz attaché au module
 *  - Timeline de tous les modules du parcours
 *  - Empty states (pas de cohorte active, entre cohortes)
 *  - Skeleton loaders (LCP < 1.5s)
 */

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();

useSeoMeta({
  title: () => t('week.pageTitle'),
  robots: 'noindex',
});

const {
  cohort,
  module,
  progression,
  allModules,
  totalModules,
  isLate,
  hasSubmitted,
  isLoading,
  error,
  refresh,
} = useCurrentWeek();

// Repo URL pour la soumission du livrable (placeholder ST-05.2)
const repoUrl = ref('');

// Charger les données au montage (SSR-compatible via onMounted pour éviter
// les problèmes d'hydratation avec les comptes à rebours).
onMounted(() => {
  void refresh();
});

/** Icône de statut de progression */
function statusIcon(status: string): string {
  switch (status) {
    case 'VALIDE':
    case 'VALIDE_OVERRIDE':
      return 'i-tabler-circle-check';
    case 'SOUMIS':
      return 'i-tabler-clock-check';
    case 'EN_COURS':
      return 'i-tabler-player-play';
    case 'EN_RETARD':
      return 'i-tabler-clock-exclamation';
    case 'BLOQUE':
      return 'i-tabler-lock';
    case 'EN_ALERTE':
      return 'i-tabler-alert-triangle';
    default:
      return 'i-tabler-circle-dashed';
  }
}

/** Couleur badge de statut */
function statusColor(status: string): string {
  switch (status) {
    case 'VALIDE':
    case 'VALIDE_OVERRIDE':
      return 'bg-success-bg text-success-fg';
    case 'SOUMIS':
      return 'bg-accent-subtle text-accent-text';
    case 'EN_RETARD':
    case 'BLOQUE':
      return 'bg-danger-bg text-danger-fg';
    case 'EN_ALERTE':
      return 'bg-warning-bg text-warning-fg';
    case 'EN_COURS':
      return 'bg-accent-subtle text-accent-text';
    default:
      return 'bg-muted text-text-muted';
  }
}

/** Icône du type de ressource */
function resourceIcon(type: string): string {
  switch (type) {
    case 'video':
      return 'i-tabler-brand-youtube';
    case 'pdf':
      return 'i-tabler-file-type-pdf';
    case 'article':
      return 'i-tabler-news';
    case 'doc':
      return 'i-tabler-book';
    case 'course':
      return 'i-tabler-school';
    default:
      return 'i-tabler-link';
  }
}
</script>

<template>
  <main id="main-content" class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- ── Bandeau erreur ──────────────────────────────────────────────── -->
    <div
      v-if="error && !isLoading"
      class="mb-6 flex items-center gap-3 rounded-lg border border-danger-bg bg-danger-bg p-4"
      role="alert"
    >
      <span class="i-tabler-circle-x size-5 shrink-0 text-danger-fg" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium text-danger-fg">{{ t('errors.generic') }}</p>
        <UButton variant="ghost" size="xs" class="mt-1" @click="refresh()">
          {{ t('common.retry') }}
        </UButton>
      </div>
    </div>

    <!-- ── Squelette de chargement ─────────────────────────────────────── -->
    <template v-if="isLoading">
      <div class="space-y-6">
        <!-- Hero skeleton -->
        <div class="rounded-xl border border-border-subtle bg-surface p-6">
          <CSkeleton height="20" width="120" class="mb-3" />
          <CSkeleton height="32" width="280" class="mb-2" />
          <CSkeleton height="16" width="200" class="mb-4" />
          <div class="flex gap-3">
            <CSkeleton height="28" width="100" />
            <CSkeleton height="28" width="80" />
          </div>
        </div>
        <!-- Resources skeleton -->
        <div class="rounded-xl border border-border-subtle bg-surface p-6">
          <CSkeleton height="20" width="100" class="mb-4" />
          <div class="space-y-3">
            <CSkeleton height="44" />
            <CSkeleton height="44" />
            <CSkeleton height="44" />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Pas de cohorte active ──────────────────────────────────────── -->
    <template v-else-if="!isLoading && !cohort">
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <span class="i-tabler-calendar-off size-16 text-text-subtle" aria-hidden="true" />
        <h1 class="mt-4 text-2xl font-semibold text-text-strong">
          {{ t('week.noCohort.title') }}
        </h1>
        <p class="mt-2 max-w-md text-sm text-text-muted">
          {{ t('week.noCohort.description') }}
        </p>
      </div>
    </template>

    <!-- ── Contenu principal ───────────────────────────────────────────── -->
    <template v-else-if="!isLoading && cohort">
      <!-- Bandeau retard -->
      <div
        v-if="isLate && module"
        class="mb-6 flex items-center gap-3 rounded-lg border border-danger-bg bg-danger-bg p-4"
        role="alert"
        aria-live="polite"
      >
        <span
          class="i-tabler-clock-exclamation size-5 shrink-0 text-danger-fg"
          aria-hidden="true"
        />
        <div class="flex-1">
          <p class="text-sm font-medium text-danger-fg">
            {{ t('week.lateWarning.title', { days: Math.abs(module.daysLeft) }) }}
          </p>
          <p class="mt-0.5 text-xs text-danger-fg/80">
            {{ t('week.lateWarning.description') }}
          </p>
        </div>
        <UButton size="sm" color="error" variant="outline" to="/aide">
          {{ t('week.lateWarning.cta') }}
        </UButton>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- ── Colonne principale (2/3) ─────────────────────────────── -->
        <div class="space-y-6 lg:col-span-2">
          <!-- ── Hero : module de la semaine ───────────────────────── -->
          <div v-if="module" class="rounded-xl border border-border-subtle bg-surface p-6">
            <!-- Fil d'Ariane -->
            <p class="text-xs font-medium tracking-wide text-text-muted uppercase">
              {{ t('week.hero.breadcrumb', { cohort: cohort.name }) }}
            </p>

            <!-- Titre + numéro de semaine -->
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-text-strong">
              {{
                t('week.hero.title', {
                  week: module.week,
                  total: totalModules,
                  moduleTitle: module.title,
                })
              }}
            </h1>

            <!-- Statut + compte à rebours -->
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <!-- Badge de statut -->
              <span
                v-if="progression"
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="statusColor(progression.status)"
                :aria-label="t(('week.status.' + progression.status) as any)"
              >
                <span :class="[statusIcon(progression.status), 'size-3']" aria-hidden="true" />
                {{ t(`week.status.${progression.status}` as any) }}
              </span>

              <!-- Compte à rebours -->
              <CountdownTimer :due-date="module.dueDate" :is-late="isLate" />
            </div>

            <!-- Objectifs -->
            <div v-if="module.objectives" class="mt-4">
              <p class="text-sm font-medium text-text-default">{{ t('week.hero.objectives') }}</p>
              <p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-text-muted">
                {{ module.objectives }}
              </p>
            </div>

            <!-- XP récompense -->
            <div class="mt-4 inline-flex items-center gap-1.5 text-xs text-text-muted">
              <span class="i-tabler-star size-3.5 text-warning-fg" aria-hidden="true" />
              {{ t('week.hero.xpReward', { xp: module.xpReward }) }}
            </div>
          </div>

          <!-- Pas de module en cours (entre cohortes ou tous terminés) -->
          <div v-else class="rounded-xl border border-border-subtle bg-surface p-6 text-center">
            <span class="i-tabler-confetti size-12 text-text-subtle" aria-hidden="true" />
            <h2 class="mt-3 text-lg font-semibold text-text-strong">
              {{ t('week.noModule.title') }}
            </h2>
            <p class="mt-1 text-sm text-text-muted">{{ t('week.noModule.description') }}</p>
          </div>

          <!-- ── Ressources ─────────────────────────────────────────── -->
          <div
            v-if="module && module.resources.length > 0"
            class="rounded-xl border border-border-subtle bg-surface p-6"
          >
            <h2 class="text-base font-semibold text-text-strong">
              {{ t('week.resources.title') }}
            </h2>
            <ul class="mt-4 space-y-2" :aria-label="t('week.resources.ariaLabel')">
              <li v-for="resource in module.resources" :key="resource.url">
                <a
                  :href="resource.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-3 rounded-lg border border-border-subtle bg-subtle p-3 transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    :class="[resourceIcon(resource.type), 'size-5 shrink-0 text-accent']"
                    aria-hidden="true"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-text-default">
                      {{ resource.title }}
                    </p>
                    <p class="truncate text-xs text-text-muted">{{ resource.url }}</p>
                  </div>
                  <span
                    class="i-tabler-external-link size-4 shrink-0 text-text-subtle"
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
          </div>

          <!-- ── Livrable ───────────────────────────────────────────── -->
          <div v-if="module" class="rounded-xl border border-border-subtle bg-surface p-6">
            <h2 class="text-base font-semibold text-text-strong">
              {{ t('week.deliverable.title') }}
            </h2>

            <p
              v-if="module.deliverable.description"
              class="mt-2 text-sm leading-relaxed text-text-muted"
            >
              {{ module.deliverable.description }}
            </p>

            <!-- Statut soumis -->
            <div
              v-if="hasSubmitted"
              class="mt-4 flex items-center gap-2 rounded-lg bg-success-bg p-3"
            >
              <span class="i-tabler-circle-check size-5 text-success-fg" aria-hidden="true" />
              <p class="text-sm font-medium text-success-fg">
                {{ t('week.deliverable.submitted') }}
              </p>
            </div>

            <!-- Formulaire de soumission (placeholder ST-05.2) -->
            <div v-else class="mt-4 space-y-3">
              <div v-if="module.deliverable.repoRequired">
                <label for="repo-url" class="block text-sm font-medium text-text-default">
                  {{ t('week.deliverable.repoUrlLabel') }}
                </label>
                <div class="mt-1 flex gap-2">
                  <UInput
                    id="repo-url"
                    v-model="repoUrl"
                    type="url"
                    :placeholder="t('week.deliverable.repoUrlPlaceholder')"
                    class="flex-1"
                    :aria-label="t('week.deliverable.repoUrlLabel')"
                  />
                </div>
              </div>
              <UButton
                color="primary"
                :disabled="module.deliverable.repoRequired && !repoUrl"
                :aria-label="t('week.deliverable.submitAriaLabel')"
              >
                <span class="i-tabler-send size-4" aria-hidden="true" />
                {{ t('week.deliverable.submitButton') }}
              </UButton>
              <p class="text-xs text-text-muted">{{ t('week.deliverable.submitHint') }}</p>
            </div>
          </div>

          <!-- ── Quiz ──────────────────────────────────────────────── -->
          <div
            v-if="module && module.hasQuiz"
            class="rounded-xl border border-accent-border bg-accent-subtle p-6"
          >
            <div class="flex items-start gap-4">
              <span class="i-tabler-help-hexagon size-8 shrink-0 text-accent" aria-hidden="true" />
              <div class="flex-1">
                <h2 class="text-base font-semibold text-text-strong">
                  {{ t('week.quiz.title') }}
                </h2>
                <p v-if="module.quizTitle" class="mt-1 text-sm text-text-muted">
                  {{ module.quizTitle }}
                </p>
                <p class="mt-1 text-sm text-text-muted">{{ t('week.quiz.description') }}</p>
                <UButton
                  class="mt-4"
                  color="primary"
                  variant="outline"
                  :to="`/quiz/${module.quizId}`"
                  :aria-label="t('week.quiz.startAriaLabel')"
                >
                  <span class="i-tabler-player-play size-4" aria-hidden="true" />
                  {{ t('week.quiz.startButton') }}
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Colonne latérale : Timeline (1/3) ─────────────────── -->
        <div class="lg:col-span-1">
          <div class="sticky top-6 rounded-xl border border-border-subtle bg-surface p-5">
            <h2 class="text-sm font-semibold text-text-strong">
              {{ t('week.timeline.title') }}
            </h2>
            <p class="mt-0.5 text-xs text-text-muted">
              {{
                t('week.timeline.subtitle', {
                  done: allModules.filter(
                    (m) => m.status === 'VALIDE' || m.status === 'VALIDE_OVERRIDE',
                  ).length,
                  total: totalModules,
                })
              }}
            </p>
            <div class="mt-4">
              <WeekTimeline
                :modules="allModules"
                :current-cohort-module-id="module?.cohortModuleId ?? null"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>
