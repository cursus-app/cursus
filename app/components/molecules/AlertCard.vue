<script setup lang="ts">
/**
 * AlertCard — carte d'alerte dans la liste /alertes.
 *
 * Affiche : nom stagiaire, type d'alerte (badge coloré), sévérité (ring),
 * extrait du contexte, date, action principale.
 *
 * Émet `click` (ouvrir le panneau détail) et `resolve` (marquer traitée).
 *
 * ST-08.3 — TT-08.3.2
 */
import type { AlertKind, AlertSeverity } from '@prisma/client';
import { useI18n } from 'vue-i18n';

interface Props {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  context: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  resolvedBy: { id: string; fullName: string | null } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [id: string];
  resolve: [id: string];
}>();

const { t } = useI18n();

/** Badge couleur selon le kind. */
const kindBadgeColor = computed<'error' | 'warning' | 'info' | 'neutral'>(() => {
  const map: Record<AlertKind, 'error' | 'warning' | 'info' | 'neutral'> = {
    SUBMISSION_LATE: 'error',
    QUIZ_REPEATEDLY_FAILED: 'warning',
    SUBMISSION_REPEATEDLY_FAILED: 'error',
    STAGIAIRE_BLOCKED: 'error',
    PROGRESS_STALLED: 'info',
    CAPSTONE_OVERDUE: 'warning',
  };
  return map[props.kind] ?? 'neutral';
});

/** Icône Tabler selon le kind. */
const kindIcon = computed<string>(() => {
  const map: Record<AlertKind, string> = {
    SUBMISSION_LATE: 'i-tabler-clock-exclamation',
    QUIZ_REPEATEDLY_FAILED: 'i-tabler-help-circle',
    SUBMISSION_REPEATEDLY_FAILED: 'i-tabler-circle-x',
    STAGIAIRE_BLOCKED: 'i-tabler-lock',
    PROGRESS_STALLED: 'i-tabler-trending-down',
    CAPSTONE_OVERDUE: 'i-tabler-flag-exclamation',
  };
  return map[props.kind] ?? 'i-tabler-alert-triangle';
});

/** Classe de bordure selon la sévérité. */
const severityBorderClass = computed<string>(() => {
  const map: Record<AlertSeverity, string> = {
    HIGH: 'ring-1 ring-danger-fg/60',
    MEDIUM: 'ring-1 ring-warning-fg/40',
    LOW: 'border border-border-subtle',
  };
  return map[props.severity] ?? 'border border-border-subtle';
});

const isResolved = computed(() => props.resolvedAt !== null);

/** Extrait lisible du contexte JSON. */
const contextSnippet = computed<string>(() => {
  if (!props.context) {return '';}
  if (typeof props.context['message'] === 'string') {return props.context['message'];}
  if (typeof props.context['reason'] === 'string') {return props.context['reason'];}
  return '';
});

/** Temps relatif. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {return t('alerts.time.justNow');}
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {return t('alerts.time.minutesAgo', { n: minutes });}
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {return t('alerts.time.hoursAgo', { n: hours });}
  const days = Math.floor(hours / 24);
  return t('alerts.time.daysAgo', { n: days });
}

const timeAgo = computed(() => relativeTime(props.createdAt));

const traineeName = computed(() => props.user.fullName ?? props.user.email);
const traineeInitials = computed(() => {
  const name = traineeName.value;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
});
</script>

<template>
  <article
    :class="[
      'flex cursor-pointer flex-col gap-3 rounded-xl bg-surface p-4 transition-shadow hover:shadow-sm',
      severityBorderClass,
      isResolved ? 'opacity-60' : '',
    ]"
    :aria-label="t('alerts.card.ariaLabel', { name: traineeName, kind: t(`alerts.kinds.${props.kind}`) })"
    role="article"
    tabindex="0"
    @click="emit('click', props.id)"
    @keydown.enter="emit('click', props.id)"
    @keydown.space.prevent="emit('click', props.id)"
  >
    <!-- En-tête -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Avatar / initiales -->
        <div
          v-if="props.user.avatarUrl"
          class="size-8 shrink-0 overflow-hidden rounded-full border border-border-subtle"
        >
          <img
            :src="props.user.avatarUrl"
            :alt="traineeName"
            class="size-full object-cover"
          >
        </div>
        <div
          v-else
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <span class="text-xs font-medium text-text-muted">{{ traineeInitials }}</span>
        </div>

        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-text-strong">{{ traineeName }}</p>
          <p class="text-xs text-text-subtle">{{ timeAgo }}</p>
        </div>
      </div>

      <!-- Badge kind + sévérité -->
      <div class="flex shrink-0 items-center gap-2">
        <UBadge :color="kindBadgeColor" variant="subtle" size="sm">
          <UIcon :name="kindIcon" class="mr-1 size-3" />
          {{ t(`alerts.kinds.${props.kind}`) }}
        </UBadge>
      </div>
    </div>

    <!-- Contexte snippet -->
    <p v-if="contextSnippet" class="line-clamp-2 text-xs text-text-muted">
      {{ contextSnippet }}
    </p>

    <!-- Pied de carte -->
    <div class="flex items-center justify-between gap-2">
      <!-- Badge résolu automatiquement -->
      <div v-if="isResolved" class="flex items-center gap-1 text-xs text-text-subtle">
        <UIcon name="i-tabler-check" class="size-3 text-success-fg" />
        <span v-if="props.resolvedById">
          {{ t('alerts.resolvedBy', { name: props.resolvedBy?.fullName ?? t('alerts.resolvedBySystem') }) }}
        </span>
        <span v-else>{{ t('alerts.autoResolved') }}</span>
      </div>
      <div v-else class="flex-1" />

      <!-- Action : marquer traitée -->
      <UButton
        v-if="!isResolved"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-tabler-check"
        :aria-label="t('alerts.actions.resolve')"
        @click.stop="emit('resolve', props.id)"
      >
        {{ t('alerts.actions.resolve') }}
      </UButton>
    </div>
  </article>
</template>
