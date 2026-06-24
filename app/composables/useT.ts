// Composable typé pour les traductions — wrapper sur useI18n de @nuxtjs/i18n.
// Exposé en auto-import Nuxt : pas besoin d'import explicite dans les SFC.
import { useI18n } from '#i18n';

/**
 * Wrapper idiomatique sur `useI18n` pour un DX uniforme dans l'app.
 * Retourne `t`, `locale`, `setLocale` et `locales` pour couvrir les cas
 * les plus courants (traduction, lecture locale courante, switch de langue).
 */
export function useT() {
  const { t, locale, setLocale, locales } = useI18n();
  return { t, locale, setLocale, locales };
}
