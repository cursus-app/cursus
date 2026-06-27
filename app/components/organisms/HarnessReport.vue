<script setup lang="ts">
/**
 * HarnessReport — organism affichant le rapport complet d'un run harnais.
 *
 * États gérés :
 *   - QUEUED / RUNNING : squelettes animés + indicateur "En cours"
 *   - SUCCESS / FAILURE : cartes par check (CheckCard) + barre de résumé
 *   - TIMEOUT : message d'erreur "Délai dépassé"
 *   - CANCELLED : message neutre
 *
 * A11y :
 *   - Structure sémantique : <section>, headings.
 *   - prefers-reduced-motion respecté (pas d'animation si actif).
 *   - aria-live pour les mises à jour dynamiques.
 *
 * Performance :
 *   - Virtualisation si > 30 checks (Intersection Observer).
 *
 * Design tokens uniquement — pas de couleurs en dur.
 */

import type { HarnessReport, CheckResult } from '~~/shared/types/harness';

// HarnessStatus Prisma enum values
type HarnessStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';

interface Props {
  report: HarnessReport | null;
  status: HarnessStatus;
}

const props = defineProps<Props>();

const { t } = useI18n();
const reducedMotion = useReducedMotion();

/** Nombre de cartes squelette à afficher pendant le chargement. */
const SKELETON_COUNT = 4;

/** Seuil de virtualisation. */
const VIRTUALIZATION_THRESHOLD = 30;

// ─── Dictionnaire check_id → { label, help } ─────────────────────────────────

interface CheckMeta {
  label: string;
  help: string;
}

/**
 * Renvoie les métadonnées traduites (label + message d'aide) pour un check_id.
 * Si le check_id est inconnu, retourne l'id technique avec un warning.
 */
function getCheckMeta(checkId: string): CheckMeta {
  const key = `harness.checks.${checkId}`;
  const labelKey = `${key}.label`;
  const helpKey = `${key}.help`;

  // useI18n().te() vérifie si la clé existe
  const { te, t: translate } = useI18n();
  if (te(labelKey)) {
    return {
      label: translate(labelKey),
      help: te(helpKey) ? translate(helpKey) : '',
    };
  }

  // Clé inconnue : afficher l'id technique
  return {
    label: checkId,
    help: translate('harness.report.unknownCheckHelp'),
  };
}

// ─── États ────────────────────────────────────────────────────────────────────

const isLoading = computed(() => props.status === 'QUEUED' || props.status === 'RUNNING');

const isTimeout = computed(() => props.status === 'TIMEOUT');
const isCancelled = computed(() => props.status === 'CANCELLED');
const isDone = computed(() => props.status === 'SUCCESS' || props.status === 'FAILURE');

// ─── Virtualisation ──────────────────────────────────────────────────────────

const checksToRender = computed<CheckResult[]>(() => {
  if (!props.report) {
    return [];
  }
  return props.report.checks;
});

const useVirtualization = computed(() => checksToRender.value.length > VIRTUALIZATION_THRESHOLD);

/** Refs pour l'Intersection Observer (virtualisation). */
const visibleChecks = ref<Set<number>>(new Set());
const cardRefs = ref<HTMLElement[]>([]);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!useVirtualization.value) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const idx = Number(entry.target.getAttribute('data-check-index'));
        if (entry.isIntersecting) {
          visibleChecks.value.add(idx);
        }
        // On ne retire pas les entrées visibles pour éviter le flash
      }
    },
    { rootMargin: '200px' },
  );

  for (const el of cardRefs.value) {
    if (el) {
      observer.observe(el);
    }
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

function isCheckVisible(index: number): boolean {
  if (!useVirtualization.value) {
    return true;
  }
  // Les 10 premiers sont toujours visibles (au-dessus du fold)
  if (index < 10) {
    return true;
  }
  return visibleChecks.value.has(index);
}

// ─── Résumé ───────────────────────────────────────────────────────────────────

const summaryMessage = computed<string>(() => {
  if (!props.report) {
    return '';
  }
  const { passed, total } = props.report.summary;
  if (passed === total) {
    return t('harness.report.summaryAllPassed');
  }
  if (passed === 0) {
    return t('harness.report.summaryAllFailed');
  }
  return t('harness.report.summaryMix', { passed, total });
});

const summaryVariant = computed<'success' | 'danger' | 'info'>(() => {
  if (!props.report) {
    return 'info';
  }
  const { passed, total } = props.report.summary;
  if (passed === total) {
    return 'success';
  }
  if (passed === 0) {
    return 'danger';
  }
  return 'info';
});

const summaryClasses: Record<'success' | 'danger' | 'info', string> = {
  success: 'bg-success-bg text-success-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
};

// ─── Statut global ────────────────────────────────────────────────────────────

const statusIconClass = computed<string>(() => {
  switch (props.status) {
    case 'SUCCESS':
      return 'i-tabler-circle-check text-success-fg';
    case 'FAILURE':
      return 'i-tabler-circle-x text-danger-fg';
    case 'TIMEOUT':
      return 'i-tabler-clock-x text-warning-fg';
    case 'CANCELLED':
      return 'i-tabler-ban text-text-muted';
    default:
      return 'i-tabler-loader-2 text-accent';
  }
});
</script>

<template>
  <section aria-labelledby="harness-report-heading" aria-live="polite" class="space-y-4">
    <!-- Titre de la section -->
    <h2
      id="harness-report-heading"
      class="flex items-center gap-2 text-lg font-semibold text-text-strong"
    >
      <span :class="[statusIconClass, 'size-5 shrink-0']" aria-hidden="true" />
      {{ t('harness.report.title') }}
    </h2>

    <!-- ── État QUEUED / RUNNING : squelettes ── -->
    <template v-if="isLoading">
      <!-- Indicateur "En cours" -->
      <div
        class="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-4 py-3"
        role="status"
        :aria-label="t('harness.report.running')"
      >
        <span
          :class="['size-3 shrink-0 rounded-full bg-accent', !reducedMotion && 'animate-pulse']"
          aria-hidden="true"
        />
        <span class="text-sm font-medium text-text-default">
          {{ status === 'QUEUED' ? t('harness.report.queued') : t('harness.report.running') }}
        </span>
      </div>

      <!-- Cartes squelette -->
      <div class="space-y-3" aria-hidden="true">
        <div
          v-for="i in SKELETON_COUNT"
          :key="i"
          class="h-16 animate-pulse rounded-lg border border-border-subtle bg-muted"
          :style="!reducedMotion ? {} : { animation: 'none' }"
        />
      </div>
    </template>

    <!-- ── État TIMEOUT ── -->
    <template v-else-if="isTimeout">
      <div
        class="flex items-start gap-3 rounded-lg border border-border-subtle bg-warning-bg px-4 py-3"
        role="alert"
      >
        <span class="i-tabler-clock-x mt-0.5 size-5 shrink-0 text-warning-fg" aria-hidden="true" />
        <div>
          <p class="font-medium text-warning-fg">{{ t('harness.report.timeoutTitle') }}</p>
          <p class="mt-0.5 text-sm text-warning-fg opacity-80">
            {{ t('harness.report.timeoutDescription') }}
          </p>
        </div>
      </div>
    </template>

    <!-- ── État CANCELLED ── -->
    <template v-else-if="isCancelled">
      <div
        class="flex items-start gap-3 rounded-lg border border-border-subtle bg-muted px-4 py-3"
        role="status"
      >
        <span class="i-tabler-ban mt-0.5 size-5 shrink-0 text-text-muted" aria-hidden="true" />
        <p class="text-sm text-text-muted">{{ t('harness.report.cancelled') }}</p>
      </div>
    </template>

    <!-- ── États SUCCESS / FAILURE : rapport complet ── -->
    <template v-else-if="isDone && report">
      <!-- Barre de résumé -->
      <div
        :class="['flex items-center gap-3 rounded-lg px-4 py-3', summaryClasses[summaryVariant]]"
        role="status"
        :aria-label="summaryMessage"
      >
        <span
          :class="[
            summaryVariant === 'success'
              ? 'i-tabler-trophy'
              : summaryVariant === 'danger'
                ? 'i-tabler-mood-sad'
                : 'i-tabler-chart-bar',
            'size-5 shrink-0',
          ]"
          aria-hidden="true"
        />
        <span class="font-medium">{{ summaryMessage }}</span>
      </div>

      <!-- Liste des checks -->
      <div class="space-y-3">
        <template v-for="(check, index) in checksToRender" :key="check.check_id">
          <!-- Sentinelle pour l'Intersection Observer (virtualisation) -->
          <div
            v-if="useVirtualization"
            :ref="
              (el) => {
                if (el) cardRefs[index] = el as HTMLElement;
              }
            "
            :data-check-index="index"
            :class="{ 'min-h-[4rem]': !isCheckVisible(index) }"
          >
            <CheckCard
              v-if="isCheckVisible(index)"
              :check="check"
              :label="getCheckMeta(check.check_id).label"
              :help-message="getCheckMeta(check.check_id).help"
              :index="index"
            />
          </div>

          <!-- Rendu direct (pas de virtualisation) -->
          <CheckCard
            v-else
            :check="check"
            :label="getCheckMeta(check.check_id).label"
            :help-message="getCheckMeta(check.check_id).help"
            :index="index"
          />
        </template>
      </div>

      <!-- Message si aucun check -->
      <div
        v-if="checksToRender.length === 0"
        class="rounded-lg border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-text-muted"
      >
        {{ t('harness.report.noChecks') }}
      </div>
    </template>

    <!-- ── Fallback : rapport null mais statut inattendu ── -->
    <template v-else-if="!report && !isLoading">
      <div
        class="rounded-lg border border-border-subtle bg-muted px-4 py-6 text-center text-sm text-text-muted"
        role="status"
      >
        {{ t('harness.report.noData') }}
      </div>
    </template>
  </section>
</template>
