<script setup lang="ts">
/**
 * XpDisplay — Affiche le total XP et la jauge mensuelle du stagiaire.
 * ST-11.1 — TT-11.1.3
 *
 * A11y : progressbar ARIA, labels explicites.
 * Perf  : composant léger, aucun fetch interne — reçoit les props du parent.
 */

const props = defineProps<{
  xpTotal: number;
  xpObjectiveMonthly?: number | null;
  /** XP accumulés depuis le début du mois (calculé côté parent ou serveur). */
  xpThisMonth?: number;
}>();

const { t } = useI18n();

const hasObjective = computed(
  () =>
    props.xpObjectiveMonthly !== null &&
    props.xpObjectiveMonthly !== undefined &&
    props.xpObjectiveMonthly > 0,
);

const monthlyProgress = computed(() => {
  if (!hasObjective.value || !props.xpObjectiveMonthly) {
    return 0;
  }
  const month = props.xpThisMonth ?? 0;
  return Math.min(100, Math.round((month / props.xpObjectiveMonthly) * 100));
});

const objectiveMet = computed(() => hasObjective.value && monthlyProgress.value >= 100);
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Total XP -->
    <div class="flex items-center gap-2">
      <UIcon name="i-tabler-star" class="size-4 text-accent" aria-hidden="true" />
      <span class="text-sm font-medium text-text-strong">
        {{ t('xp.total', { count: xpTotal }) }}
      </span>
    </div>

    <!-- Jauge mensuelle (uniquement si objectif défini) -->
    <template v-if="hasObjective">
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between text-xs text-text-muted">
          <span>{{ t('xp.monthlyProgress') }}</span>
          <span :class="objectiveMet ? 'font-semibold text-success-fg' : ''">
            {{ monthlyProgress }}%
          </span>
        </div>
        <div
          role="progressbar"
          :aria-valuenow="monthlyProgress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="
            t('xp.monthlyProgressAriaLabel', {
              progress: monthlyProgress,
              objective: xpObjectiveMonthly,
            })
          "
          class="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            class="h-full rounded-full motion-safe:transition-all motion-safe:duration-300"
            :class="objectiveMet ? 'bg-success-solid' : 'bg-accent'"
            :style="{ width: `${monthlyProgress}%` }"
          />
        </div>
        <p v-if="objectiveMet" class="text-xs font-medium text-success-fg">
          {{ t('xp.objectiveMet') }}
        </p>
      </div>
    </template>
  </div>
</template>
