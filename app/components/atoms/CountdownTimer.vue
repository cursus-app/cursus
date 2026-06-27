<script setup lang="ts">
/**
 * CountdownTimer — atome affichant un compte à rebours jours:heures:min.
 *
 * Props :
 *  - dueDate  : date limite (string ISO 8601)
 *  - isLate   : si vrai, affiche le retard (nombre de jours dépassés)
 *
 * A11y : aria-live="polite" + aria-label calculé pour les lecteurs d'écran.
 * Animation : désactivée si prefers-reduced-motion.
 */

const props = defineProps<{
  dueDate: string;
  isLate?: boolean;
}>();

const { t } = useI18n();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
}

function computeTimeLeft(dueDate: string): TimeLeft {
  const now = Date.now();
  const target = new Date(dueDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    // En retard : calculer le retard
    const lateDiffMs = Math.abs(diffMs);
    const days = Math.floor(lateDiffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((lateDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((lateDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, totalMs: diffMs };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, totalMs: diffMs };
}

const timeLeft = ref<TimeLeft>(computeTimeLeft(props.dueDate));

// Pad numbers to 2 digits
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const isOverdue = computed(() => timeLeft.value.totalMs < 0);

const ariaLabel = computed(() => {
  const { days, hours, minutes } = timeLeft.value;
  if (isOverdue.value || props.isLate) {
    return t('week.countdown.ariaLate', { days, hours, minutes });
  }
  return t('week.countdown.ariaLabel', { days, hours, minutes });
});

// Couleur selon urgence
const colorClass = computed(() => {
  if (isOverdue.value || props.isLate) {
    return 'text-danger-fg';
  }
  if (timeLeft.value.days <= 1) {
    return 'text-warning-fg';
  }
  return 'text-text-default';
});

// Mise à jour toutes les minutes
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    timeLeft.value = computeTimeLeft(props.dueDate);
  }, 60_000);
});

onUnmounted(() => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
});

watch(
  () => props.dueDate,
  (newVal) => {
    timeLeft.value = computeTimeLeft(newVal);
  },
);
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 font-mono text-sm font-medium"
    :class="colorClass"
    aria-live="polite"
    :aria-label="ariaLabel"
    role="timer"
  >
    <template v-if="isOverdue || isLate">
      <span class="i-tabler-clock-exclamation size-4 shrink-0" aria-hidden="true" />
      <span>
        {{ t('week.countdown.late', { days: timeLeft.days }) }}
      </span>
    </template>
    <template v-else>
      <span class="i-tabler-clock size-4 shrink-0" aria-hidden="true" />
      <span>
        <span aria-hidden="true">
          {{ pad(timeLeft.days) }}j {{ pad(timeLeft.hours) }}h {{ pad(timeLeft.minutes) }}min
        </span>
        <span class="sr-only">{{ ariaLabel }}</span>
      </span>
    </template>
  </div>
</template>
