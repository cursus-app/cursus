import { computed } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * Retourne true si l'utilisateur a activé prefers-reduced-motion: reduce.
 *
 * Comportement :
 * - SSR / matchMedia indisponible (JSDOM, Node) → false (pas de restriction)
 * - Navigateur avec prefers-reduced-motion: reduce → true
 * - Navigateur avec prefers-reduced-motion: no-preference → false
 *
 * Réagit aux changements en temps réel (l'utilisateur peut changer le réglage
 * OS sans recharger la page).
 */
export function useReducedMotion(): ComputedRef<boolean> {
  // useMediaQuery est auto-importé via @vueuse/nuxt.
  // Retourne un Ref<boolean> (false côté serveur ou si matchMedia absent).
  const matches = useMediaQuery('(prefers-reduced-motion: reduce)');
  return computed(() => matches.value);
}
