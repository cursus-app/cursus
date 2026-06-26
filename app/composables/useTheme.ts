/**
 * Composable de gestion du thème (light / dark / system).
 * Wraps useColorMode() de @vueuse/core (auto-import via @vueuse/nuxt).
 *
 * - Anonyme : préférence stockée en localStorage (géré par useColorMode).
 * - Authentifié : synchronisé en DB via PUT /api/me/preferences/theme.
 *
 * Ordre de priorité : DB > localStorage > prefers-color-scheme.
 */

export type ThemeValue = 'light' | 'dark' | 'system';

const VALID_THEMES: readonly ThemeValue[] = ['light', 'dark', 'system'];

function isThemeValue(v: string): v is ThemeValue {
  return (VALID_THEMES as readonly string[]).includes(v);
}

export function useTheme() {
  const colorMode = useColorMode();
  const { track } = useAnalytics();
  const userStore = useUserStore();

  const theme = computed<ThemeValue>({
    get: () => {
      const pref = colorMode.preference;
      return isThemeValue(pref) ? pref : 'system';
    },
    set: (value) => {
      colorMode.preference = value;
    },
  });

  const isDark = computed(() => colorMode.value === 'dark');

  async function setTheme(value: ThemeValue): Promise<void> {
    const previous = theme.value;
    theme.value = value;
    track('theme_toggled', { from: previous, to: value });

    if (userStore.userId) {
      try {
        await $fetch('/api/me/preferences/theme', {
          method: 'PUT',
          body: { theme: value },
        });
      } catch (err) {
        // Non-fatal: localStorage déjà mis à jour.
        // Warn pour détecter les pannes DB persistantes sans bloquer l'UX.
        if (import.meta.dev) {
          console.warn('[useTheme] DB sync failed (best-effort):', err);
        }
      }
    }
  }

  function cycleTheme(): void {
    const cycle: ThemeValue[] = ['system', 'light', 'dark'];
    const currentIndex = cycle.indexOf(theme.value);
    const nextIndex = (currentIndex + 1) % cycle.length;
    void setTheme(cycle[nextIndex] ?? 'system');
  }

  return {
    theme,
    isDark,
    setTheme,
    cycleTheme,
  };
}
