<script setup lang="ts">
/**
 * CheckCard — molecule carte individuelle d'un check de harnais.
 *
 * Affiche le statut, le titre humain, le message d'aide et un accordion
 * vers les détails techniques bruts.
 *
 * A11y :
 *   - Icône + texte (jamais icône seule, pour les daltoniens).
 *   - Accordion natif <details>/<summary> pour navigation clavier.
 *   - aria-label sur le statut pour les lecteurs d'écran.
 *
 * Design tokens uniquement — pas de couleurs en dur.
 */

import type { CheckResult, CheckStatus } from '~~/shared/types/harness';

interface Props {
  check: CheckResult;
  /** Titre humain du check (traduit). */
  label: string;
  /** Message d'aide affiché en cas d'échec/erreur (traduit). */
  helpMessage?: string | null;
  /** Index pour les clés / aria. */
  index: number;
}

const props = withDefaults(defineProps<Props>(), {
  helpMessage: null,
});

const { t } = useI18n();

/** Icônes Tabler par statut. */
const statusIcons: Record<CheckStatus, string> = {
  success: 'i-tabler-circle-check',
  failure: 'i-tabler-circle-x',
  error: 'i-tabler-alert-triangle',
  skipped: 'i-tabler-player-skip-forward',
  pending: 'i-tabler-clock',
};

/** Classes de couleur de la bordure gauche par statut (tokens design system). */
const statusBorderClasses: Record<CheckStatus, string> = {
  success: 'border-l-success-fg',
  failure: 'border-l-danger-fg',
  error: 'border-l-warning-fg',
  skipped: 'border-l-border-subtle',
  pending: 'border-l-border-subtle',
};

/** Classes de couleur de l'icône par statut (tokens design system). */
const statusIconClasses: Record<CheckStatus, string> = {
  success: 'text-success-fg',
  failure: 'text-danger-fg',
  error: 'text-warning-fg',
  skipped: 'text-text-muted',
  pending: 'text-text-muted',
};

/** Label ARIA du statut pour les lecteurs d'écran. */
const statusAriaLabels: Record<CheckStatus, string> = {
  success: t('harness.report.statusLabel.success'),
  failure: t('harness.report.statusLabel.failure'),
  error: t('harness.report.statusLabel.error'),
  skipped: t('harness.report.statusLabel.skipped'),
  pending: t('harness.report.statusLabel.pending'),
};

const hasDetails = computed(
  () =>
    props.check.details !== undefined &&
    props.check.details !== null &&
    typeof props.check.details === 'object' &&
    Object.keys(props.check.details as Record<string, unknown>).length > 0,
);

const detailsJson = computed(() =>
  hasDetails.value ? JSON.stringify(props.check.details, null, 2) : '',
);

const showHelpMessage = computed(
  () =>
    (props.check.status === 'failure' || props.check.status === 'error') &&
    props.helpMessage != null,
);

const summaryId = computed(() => `check-card-summary-${props.index}`);
const detailsId = computed(() => `check-card-details-${props.index}`);
</script>

<template>
  <article
    :aria-labelledby="summaryId"
    :class="[
      'rounded-lg border border-border-subtle bg-surface',
      'border-l-4',
      statusBorderClasses[check.status],
      'overflow-hidden',
    ]"
  >
    <!-- En-tête : icône + titre + statut -->
    <div class="flex items-start gap-3 px-4 py-3">
      <!-- Icône avec aria-label pour statut (jamais icône seule) -->
      <span
        :class="[
          statusIcons[check.status],
          statusIconClasses[check.status],
          'mt-0.5 size-5 shrink-0',
        ]"
        :aria-label="statusAriaLabels[check.status]"
        role="img"
      />

      <div class="min-w-0 flex-1">
        <!-- Titre humain du check -->
        <p :id="summaryId" class="font-medium text-text-strong">
          {{ label }}
        </p>

        <!-- Message du harnais -->
        <p v-if="check.message" class="mt-0.5 text-sm text-text-muted">
          {{ check.message }}
        </p>

        <!-- Message d'aide (uniquement en cas d'échec ou d'erreur) -->
        <p v-if="showHelpMessage" class="mt-1 text-sm text-text-default">
          {{ helpMessage }}
        </p>

        <!-- Durée d'exécution -->
        <p v-if="check.durationMs !== undefined" class="mt-1 text-xs text-text-subtle">
          {{ t('harness.report.duration', { ms: check.durationMs }) }}
        </p>
      </div>

      <!-- Badge statut visible (couleur + texte) -->
      <span
        :class="[
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          check.status === 'success' && 'bg-success-bg text-success-fg',
          check.status === 'failure' && 'bg-danger-bg text-danger-fg',
          check.status === 'error' && 'bg-warning-bg text-warning-fg',
          (check.status === 'skipped' || check.status === 'pending') && 'bg-muted text-text-muted',
        ]"
        :aria-hidden="true"
      >
        {{ t(`harness.report.statusLabel.${check.status}`) }}
      </span>
    </div>

    <!-- Accordion détails techniques (natif <details>/<summary>) -->
    <details v-if="hasDetails" :id="detailsId" class="border-t border-border-subtle">
      <summary
        class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-text-muted transition-colors hover:bg-muted hover:text-text-default focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
      >
        <span class="i-tabler-code size-4" aria-hidden="true" />
        {{ t('harness.report.viewDetails') }}
      </summary>
      <div class="bg-muted px-4 py-3">
        <pre
          class="overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap text-text-default"
          >{{ detailsJson }}</pre
        >
      </div>
    </details>
  </article>
</template>
