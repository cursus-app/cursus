<script setup lang="ts">
/**
 * SubmissionStatusBadge — affiche le statut d'une soumission avec couleur sémantique.
 *
 * Statuts supportés (SubmissionStatus Prisma) :
 *   PENDING, RUNNING, VALIDATED, VALIDATED_OVERRIDE, FAILED, TIMEOUT, BLOCKED
 *
 * Design tokens : bg-success-bg/text-success-fg, bg-danger-bg/text-danger-fg, etc.
 * A11y : rôle "status", aria-label explicite
 * ST-05.4
 */

import type { SubmissionStatus } from '@prisma/client';

interface Props {
  status: SubmissionStatus | string;
  size?: 'sm' | 'md';
}

const { status, size = 'md' } = defineProps<Props>();

interface BadgeConfig {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  labelKey: string;
}

const CONFIG: Record<string, BadgeConfig> = {
  PENDING: {
    variant: 'default',
    icon: 'i-tabler-clock',
    labelKey: 'submissions.status.PENDING',
  },
  RUNNING: {
    variant: 'info',
    icon: 'i-tabler-loader',
    labelKey: 'submissions.status.RUNNING',
  },
  VALIDATED: {
    variant: 'success',
    icon: 'i-tabler-circle-check',
    labelKey: 'submissions.status.VALIDATED',
  },
  VALIDATED_OVERRIDE: {
    variant: 'success',
    icon: 'i-tabler-shield-check',
    labelKey: 'submissions.status.VALIDATED_OVERRIDE',
  },
  FAILED: {
    variant: 'danger',
    icon: 'i-tabler-circle-x',
    labelKey: 'submissions.status.FAILED',
  },
  TIMEOUT: {
    variant: 'warning',
    icon: 'i-tabler-clock-off',
    labelKey: 'submissions.status.TIMEOUT',
  },
  BLOCKED: {
    variant: 'warning',
    icon: 'i-tabler-lock',
    labelKey: 'submissions.status.BLOCKED',
  },
};

const { t } = useI18n();

const config = computed<BadgeConfig>(
  () =>
    CONFIG[status] ?? {
      variant: 'default',
      icon: 'i-tabler-question-mark',
      labelKey: 'submissions.status.PENDING',
    },
);

const variantClasses: Record<string, string> = {
  default: 'bg-muted text-text-default',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};
</script>

<template>
  <span
    role="status"
    :aria-label="t(config.labelKey)"
    :class="[
      'inline-flex items-center rounded-full font-medium',
      sizeClasses[size],
      variantClasses[config.variant],
    ]"
  >
    <span
      :class="[config.icon, 'shrink-0', size === 'sm' ? 'size-3' : 'size-3.5']"
      aria-hidden="true"
    />
    {{ t(config.labelKey) }}
  </span>
</template>
