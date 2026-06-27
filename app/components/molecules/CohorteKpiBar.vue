<script setup lang="ts">
/**
 * CohorteKpiBar — bandeau 4 KPIs du dashboard formateur.
 * Cf. ST-13.2 — TT-13.2.3.
 */

interface Props {
  medianProgress: number;
  openAlerts: number;
  capstonesThisWeek: number;
  submissionRate: number;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const { t } = useI18n();

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  accent: string;
  ariaLabel: string;
}

const cards = computed<KpiCard[]>(() => [
  {
    label: t('cohorte.dashboard.kpi.medianProgress'),
    value: props.loading ? '—' : `${props.medianProgress}%`,
    icon: 'i-tabler-trending-up',
    accent: 'text-accent-text',
    ariaLabel: t('cohorte.dashboard.kpi.medianProgressAriaLabel', {
      value: props.medianProgress,
    }),
  },
  {
    label: t('cohorte.dashboard.kpi.openAlerts'),
    value: props.loading ? '—' : String(props.openAlerts),
    icon: 'i-tabler-alert-triangle',
    accent: props.openAlerts > 0 ? 'text-warning-fg' : 'text-text-muted',
    ariaLabel: t('cohorte.dashboard.kpi.openAlertsAriaLabel', { value: props.openAlerts }),
  },
  {
    label: t('cohorte.dashboard.kpi.capstonesThisWeek'),
    value: props.loading ? '—' : String(props.capstonesThisWeek),
    icon: 'i-tabler-calendar-event',
    accent: 'text-info-fg',
    ariaLabel: t('cohorte.dashboard.kpi.capstonesThisWeekAriaLabel', {
      value: props.capstonesThisWeek,
    }),
  },
  {
    label: t('cohorte.dashboard.kpi.submissionRate'),
    value: props.loading ? '—' : `${props.submissionRate}%`,
    icon: 'i-tabler-send',
    accent: props.submissionRate >= 80 ? 'text-success-fg' : 'text-warning-fg',
    ariaLabel: t('cohorte.dashboard.kpi.submissionRateAriaLabel', {
      value: props.submissionRate,
    }),
  },
]);
</script>

<template>
  <div
    class="grid grid-cols-2 gap-3 lg:grid-cols-4"
    role="region"
    :aria-label="t('cohorte.dashboard.kpiRegionLabel')"
  >
    <UCard v-for="card in cards" :key="card.label" class="border border-border-subtle bg-surface">
      <div class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <UIcon :name="card.icon" class="size-5" :class="card.accent" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1" :aria-label="card.ariaLabel">
          <p class="text-xs font-medium text-text-muted">{{ card.label }}</p>
          <template v-if="loading">
            <div class="mt-1 h-7 w-14 animate-pulse rounded bg-muted" aria-hidden="true" />
          </template>
          <p v-else class="mt-0.5 text-2xl font-semibold text-text-strong tabular-nums">
            {{ card.value }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
