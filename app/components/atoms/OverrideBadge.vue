<script setup lang="ts">
/**
 * OverrideBadge — atome badge "Validé manuellement" (ST-06.5).
 *
 * Affiché sur la fiche submission quand status = VALIDE_OVERRIDE.
 * Couleur warning (bg-warning-bg / text-warning-fg).
 * Tooltip avec raison, formateur, date.
 * A11y : texte complet visible aux lecteurs d'écran (pas juste une icône).
 */

interface Props {
  reason?: string | null;
  overrideByName?: string | null;
  overrideAt?: string | Date | null;
}

const props = withDefaults(defineProps<Props>(), {
  reason: null,
  overrideByName: null,
  overrideAt: null,
});

const { t, locale } = useI18n();

const formattedDate = computed<string | null>(() => {
  if (!props.overrideAt) {
    return null;
  }
  const d = typeof props.overrideAt === 'string' ? new Date(props.overrideAt) : props.overrideAt;
  return d.toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' });
});

const tooltipText = computed<string>(() => {
  const parts: string[] = [];
  if (props.reason) {
    parts.push(t('override.badge.tooltipReason', { reason: props.reason }));
  }
  if (props.overrideByName) {
    parts.push(t('override.badge.tooltipBy', { name: props.overrideByName }));
  }
  if (formattedDate.value) {
    parts.push(t('override.badge.tooltipDate', { date: formattedDate.value }));
  }
  return parts.join(' · ');
});

const tooltipId = `override-badge-tooltip-${Math.random().toString(36).slice(2, 9)}`;
</script>

<template>
  <!-- Wrapper relatif pour le tooltip CSS -->
  <span class="group relative inline-flex items-center">
    <!-- Badge visible -->
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-sm font-medium text-warning-fg"
      :aria-describedby="tooltipText ? tooltipId : undefined"
    >
      <span class="i-tabler-pencil-check size-4 shrink-0" aria-hidden="true" />
      <!-- Texte complet visible aux lecteurs d'écran -->
      {{ t('override.badge.label') }}
    </span>

    <!-- Tooltip CSS (conditionnel si des détails existent) -->
    <span
      v-if="tooltipText"
      :id="tooltipId"
      role="tooltip"
      class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs -translate-x-1/2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-text-default shadow-sm opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
    >
      {{ tooltipText }}
    </span>
  </span>
</template>
