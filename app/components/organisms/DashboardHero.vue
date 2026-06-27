<script setup lang="ts">
/**
 * DashboardHero — Section « Cette semaine » du dashboard stagiaire.
 *
 * Affiche le module de la semaine en cours avec :
 *   - Titre du module et statut
 *   - Compte à rebours jusqu'à l'échéance (aria-live polite, rafraîchi toutes les 60s)
 *   - Bouton primaire « Soumettre mon livrable »
 *
 * États gérés :
 *   - Chargement (skeleton)
 *   - Sans cohorte (onboarding)
 *   - Module en cours / à venir
 *   - Déjà soumis
 *
 * ST-13.1
 */
import type { DashboardData } from '~/composables/useDashboard';

interface Props {
  data: DashboardData['currentWeek'] | null;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const { t } = useI18n();
const reducedMotion = useReducedMotion();

// ── Compte à rebours ──────────────────────────────────────────────────────────

const now = ref(new Date());

// Mise à jour toutes les 60s pour ne pas spammer les screen-readers
let countdownInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  countdownInterval = setInterval(() => {
    now.value = new Date();
  }, 60_000);
});

onUnmounted(() => {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
  }
});

const countdown = computed((): string => {
  if (!props.data?.dueDate) { return ''; }
  const due = new Date(props.data.dueDate);
  const diff = due.getTime() - now.value.getTime();

  if (diff <= 0) { return t('dashboard.hero.overdue'); }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return t('dashboard.hero.countdown.days', { days, hours });
  }
  return t('dashboard.hero.countdown.hours', { hours });
});

const statusLabel = computed((): string => {
  const status = props.data?.status;
  if (!status) { return ''; }
  const map: Record<string, string> = {
    EN_COURS: t('dashboard.hero.status.inProgress'),
    A_VENIR: t('dashboard.hero.status.upcoming'),
    SOUMIS: t('dashboard.hero.status.submitted'),
    EN_RETARD: t('dashboard.hero.status.late'),
    EN_ALERTE: t('dashboard.hero.status.alert'),
    BLOQUE: t('dashboard.hero.status.blocked'),
  };
  return map[status] ?? status;
});

const statusColor = computed((): string => {
  const status = props.data?.status;
  if (status === 'SOUMIS') { return 'text-success-fg bg-success-bg'; }
  if (status === 'EN_RETARD' || status === 'EN_ALERTE') { return 'text-warning-fg bg-warning-bg'; }
  if (status === 'BLOQUE') { return 'text-danger-fg bg-danger-bg'; }
  return 'text-text-muted bg-muted';
});

const isOverdue = computed(
  () => props.data?.status === 'EN_RETARD' || props.data?.status === 'EN_ALERTE',
);
</script>

<template>
  <section
    class="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8"
    aria-labelledby="dashboard-hero-heading"
  >
    <!-- Chargement -->
    <template v-if="props.isLoading">
      <CSkeleton class="mb-3 h-4 w-24" />
      <CSkeleton class="mb-2 h-7 w-3/4" />
      <CSkeleton class="mb-6 h-4 w-48" />
      <CSkeleton class="h-10 w-40 rounded-md" />
    </template>

    <!-- Sans module en cours -->
    <template v-else-if="!props.data?.moduleId">
      <div class="flex flex-col items-start gap-4">
        <div
          class="flex size-12 items-center justify-center rounded-lg bg-accent"
          aria-hidden="true"
        >
          <span class="i-tabler-rocket-off size-6 text-accent-text" />
        </div>
        <div>
          <h2
            id="dashboard-hero-heading"
            class="text-xl font-semibold tracking-tight text-text-strong"
          >
            {{ t('dashboard.hero.noCohort.title') }}
          </h2>
          <p class="mt-2 text-sm text-text-muted">
            {{ t('dashboard.hero.noCohort.description') }}
          </p>
        </div>
        <UButton
          to="/cursus"
          color="primary"
          size="lg"
          leading-icon="i-tabler-book-open"
        >
          {{ t('dashboard.hero.noCohort.cta') }}
        </UButton>
      </div>
    </template>

    <!-- Module en cours -->
    <template v-else>
      <!-- Label statut -->
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="statusColor"
      >
        {{ statusLabel }}
      </span>

      <!-- Titre module -->
      <h2
        id="dashboard-hero-heading"
        class="mt-3 text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl"
      >
        {{ props.data.moduleTitle }}
      </h2>

      <!-- Compte à rebours -->
      <p
        class="mt-2 flex items-center gap-2 text-sm text-text-muted"
        :class="isOverdue ? 'text-warning-fg' : ''"
        aria-live="polite"
        aria-atomic="true"
      >
        <span class="i-tabler-clock size-4" aria-hidden="true" />
        {{ countdown }}
      </p>

      <!-- CTA Soumettre -->
      <div class="mt-6">
        <UButton
          v-if="!props.data.hasSubmitted"
          :to="`/cursus/module/${props.data.moduleId}/soumettre`"
          color="primary"
          size="lg"
          leading-icon="i-tabler-send"
          :class="!reducedMotion ? 'transition-transform hover:scale-105' : ''"
        >
          {{ t('dashboard.hero.submitCta') }}
        </UButton>
        <UButton
          v-else
          :to="`/cursus/module/${props.data.moduleId}`"
          color="primary"
          variant="outline"
          size="lg"
          leading-icon="i-tabler-check"
        >
          {{ t('dashboard.hero.viewSubmission') }}
        </UButton>
      </div>
    </template>
  </section>
</template>
