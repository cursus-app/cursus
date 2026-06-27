<script setup lang="ts">
/**
 * SubmissionCard — carte d'une soumission dans la timeline /mon-parcours.
 *
 * Affiche :
 *  - Date (<time datetime="...">)
 *  - Semaine + titre du module
 *  - SubmissionStatusBadge
 *  - Numéro de tentative
 *  - Accordion pour le rapport harnais détaillé (checks)
 *  - Lien vers le workflow GitHub Actions si disponible
 *
 * A11y :
 *  - <article> sémantique
 *  - bouton toggle avec aria-expanded
 *  - <time> avec datetime ISO
 *
 * ST-05.4
 */

import type { SubmissionItem } from '~~/app/composables/useMySubmissions';

interface Props {
  submission: SubmissionItem;
}

const { submission } = defineProps<Props>();

const { t, d } = useI18n();
const isExpanded = ref(false);

const formattedDate = computed(() => d(new Date(submission.submittedAt), 'long'));

/** Checks du HarnessRun — tableau d'objets { name, passed, message? } */
interface CheckItem {
  name: string;
  passed: boolean;
  message?: string;
}

const checks = computed<CheckItem[]>(() => {
  const json = submission.latestHarnessRun?.checksJson;
  if (!json || !Array.isArray(json)) {
    return [];
  }
  return (json as unknown[]).filter(
    (item): item is CheckItem =>
      typeof item === 'object' && item !== null && 'name' in item && 'passed' in item,
  );
});

const hasHarnessReport = computed(
  () =>
    submission.latestHarnessRun !== null &&
    (checks.value.length > 0 || submission.latestHarnessRun.githubWorkflowUrl),
);

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <article
    class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
    :aria-label="
      t('submissions.card.ariaLabel', {
        module: submission.module.title,
        week: submission.module.week,
      })
    "
  >
    <!-- En-tête : date + statut -->
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex flex-col gap-0.5">
        <time :datetime="submission.submittedAt" class="text-xs text-text-subtle">
          {{ formattedDate }}
        </time>
        <p class="text-sm font-semibold text-text-strong">
          {{ t('submissions.card.weekLabel', { n: submission.module.week }) }}
          &mdash; {{ submission.module.title }}
        </p>
        <p class="text-xs text-text-muted">
          {{ t('submissions.card.attempt', { n: submission.attemptNumber }) }}
        </p>
      </div>

      <SubmissionStatusBadge :status="submission.status" size="sm" />
    </div>

    <!-- Liens rapides -->
    <div class="mt-3 flex flex-wrap gap-2">
      <a
        v-if="submission.latestHarnessRun?.githubWorkflowUrl"
        :href="submission.latestHarnessRun.githubWorkflowUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-accent-text underline-offset-2 hover:underline"
        :aria-label="t('submissions.card.viewReportAriaLabel')"
      >
        <span class="i-tabler-external-link size-3.5" aria-hidden="true" />
        {{ t('submissions.card.viewReport') }}
      </a>
    </div>

    <!-- Toggle rapport harnais -->
    <div v-if="hasHarnessReport" class="mt-3">
      <button
        type="button"
        :aria-expanded="isExpanded"
        :aria-controls="`harness-${submission.id}`"
        class="flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-default"
        @click="toggleExpand"
      >
        <span
          :class="[
            'i-tabler-chevron-right size-3.5 transition-transform duration-200',
            isExpanded ? 'rotate-90' : '',
          ]"
          aria-hidden="true"
        />
        {{ isExpanded ? t('submissions.card.hideDetails') : t('submissions.card.showDetails') }}
      </button>

      <!-- Détails harnais (accordion) -->
      <div
        v-if="isExpanded"
        :id="`harness-${submission.id}`"
        class="mt-3 space-y-1.5 rounded-lg bg-muted p-3"
      >
        <p class="mb-2 text-xs font-medium text-text-default">
          {{ t('submissions.card.harnessChecks') }}
        </p>

        <!-- Pas de checks JSON mais URL disponible -->
        <template v-if="checks.length === 0">
          <p class="text-xs text-text-muted">
            {{ t('submissions.card.noChecksData') }}
          </p>
        </template>

        <!-- Liste des checks -->
        <ul v-else class="space-y-1" role="list" :aria-label="t('submissions.card.harnessChecks')">
          <li v-for="check in checks" :key="check.name" class="flex items-start gap-2 text-xs">
            <span
              :class="[
                'mt-0.5 size-3.5 shrink-0',
                check.passed
                  ? 'i-tabler-circle-check text-success-fg'
                  : 'i-tabler-circle-x text-danger-fg',
              ]"
              :aria-label="
                check.passed ? t('submissions.card.checkPassed') : t('submissions.card.checkFailed')
              "
            />
            <span class="text-text-default">{{ check.name }}</span>
            <span v-if="check.message" class="text-text-muted italic"> — {{ check.message }} </span>
          </li>
        </ul>

        <!-- Durée -->
        <p
          v-if="submission.latestHarnessRun?.startedAt && submission.latestHarnessRun?.finishedAt"
          class="mt-2 text-xs text-text-subtle"
        >
          {{
            t('submissions.card.duration', {
              s: Math.round(
                (new Date(submission.latestHarnessRun.finishedAt).getTime() -
                  new Date(submission.latestHarnessRun.startedAt).getTime()) /
                  1000,
              ),
            })
          }}
        </p>
      </div>
    </div>
  </article>
</template>
