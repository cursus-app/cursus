/**
 * useCommandPalette — état global de la command palette (Cmd+K).
 *
 * Utilise useState (Nuxt) pour un état SSR-safe partagé entre tous les
 * composants sans Pinia store supplémentaire.
 * Idempotent : appeler open() plusieurs fois ne crée pas de montures multiples.
 */
export function useCommandPalette() {
  const isOpen = useState('command-palette-open', () => false);

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  return { isOpen: readonly(isOpen), open, close, toggle };
}
