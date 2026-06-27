<script setup lang="ts">
/**
 * LiveIndicator — atome indicateur de connexion temps réel.
 *
 * Affiche un dot pulsant vert quand la connexion WebSocket est active,
 * ou un dot gris avec texte alternatif en cas de fallback polling.
 *
 * Accessibilité :
 *  - aria-live="polite" (pas assertive — l'info n'est pas urgente)
 *  - Changements de statut annoncés aux lecteurs d'écran
 *  - animate-pulse respecte prefers-reduced-motion via CSS (@media)
 *
 * Design tokens uniquement : bg-success-solid (vert), bg-muted (gris).
 */

interface Props {
  /** WebSocket actif et subscription établie. */
  connected: boolean;
  /** Fallback polling actif (WS indisponible). */
  polling?: boolean;
}

const { connected, polling = false } = defineProps<Props>();

const { t } = useI18n();
const reducedMotion = useReducedMotion();

const label = computed(() => {
  if (connected) {return t('realtime.live');}
  if (polling) {return t('realtime.polling');}
  return t('realtime.disconnected');
});
</script>

<template>
  <span
    role="status"
    aria-live="polite"
    :aria-label="label"
    class="inline-flex items-center gap-1.5"
  >
    <!-- Dot indicateur -->
    <span
      :class="[
        'inline-block size-2 rounded-full',
        connected ? 'bg-success-solid' : 'bg-muted',
        connected && !reducedMotion ? 'animate-pulse' : '',
      ]"
      aria-hidden="true"
    />
    <!-- Texte visible -->
    <span class="text-xs text-text-muted">{{ label }}</span>
  </span>
</template>
