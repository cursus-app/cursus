<script setup lang="ts">
/**
 * ThemeToggle — bouton icon-only pour basculer entre light / dark / system.
 * Cycle : system → light → dark → system.
 * aria-label annonce toujours le prochain état (pas l'état courant).
 */

import type { ThemeValue } from '~/composables/useTheme';

const { t } = useI18n();
const { theme, isDark, cycleTheme } = useTheme();

const CYCLE: ThemeValue[] = ['system', 'light', 'dark'];

const nextTheme = computed<ThemeValue>(() => {
  const idx = CYCLE.indexOf(theme.value);
  return CYCLE[(idx + 1) % CYCLE.length] ?? 'system';
});

const icon = computed(() => {
  if (theme.value === 'system') {
    return 'i-tabler-device-laptop';
  }
  if (isDark.value) {
    return 'i-tabler-moon';
  }
  return 'i-tabler-sun';
});

const ariaLabel = computed(() => {
  if (nextTheme.value === 'system') {
    return t('theme.switchToSystem');
  }
  if (nextTheme.value === 'light') {
    return t('theme.switchToLight');
  }
  return t('theme.switchToDark');
});
</script>

<template>
  <div>
    <UButton
      color="neutral"
      variant="ghost"
      :icon="icon"
      :aria-label="ariaLabel"
      size="sm"
      @click="cycleTheme"
    />
    <!-- Annonce discrète du nouveau thème pour les lecteurs d'écran -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ t(`theme.${theme}`) }}
    </div>
  </div>
</template>
