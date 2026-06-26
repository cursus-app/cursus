/**
 * useAppI18n — Wrapper typé sur useI18n() de @nuxtjs/i18n.
 *
 * Objectifs :
 * - Exposer `locale` comme `ComputedRef<SupportedLocale>` (type strict, pas `string`).
 * - Offrir des helpers `isFr` / `isEn` pour des conditions lisibles dans les SFC.
 * - Typer `switchLocale` en acceptant uniquement `SupportedLocale`.
 * - Rester un thin wrapper : toute la logique réelle vit dans @nuxtjs/i18n.
 *
 * Différence avec useT : useT est un shortcut général (t + locale brut).
 * useAppI18n est l'API full-featured pour les composants qui gèrent la locale
 * (LanguageSwitcher, page profil, middleware).
 */
import { useI18n } from '#i18n';

// Locales supportées — doit correspondre à nuxt.config.ts i18n.locales
export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Type-guard : vérifie qu'une string est une locale supportée.
 */
export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Normalise une locale inconnue vers une locale supportée (fallback : 'fr').
 */
export function normalizeSupportedLocale(value: string): SupportedLocale {
  return isSupportedLocale(value) ? value : 'fr';
}

export interface LocaleOption {
  code: SupportedLocale;
  name: string;
  language: string;
}

export function useAppI18n() {
  const { t, locale: rawLocale, setLocale: i18nSetLocale, locales: rawLocales } = useI18n();

  /**
   * Locale courante typée — jamais une string inconnue.
   * Fallback 'fr' si @nuxtjs/i18n retourne une valeur inattendue.
   */
  const locale = computed<SupportedLocale>(() => normalizeSupportedLocale(rawLocale.value));

  const isFr = computed(() => locale.value === 'fr');
  const isEn = computed(() => locale.value === 'en');

  /**
   * Liste des locales disponibles sous forme typée.
   */
  const localeOptions = computed<LocaleOption[]>(() =>
    (rawLocales.value as Array<{ code: string; name?: string; language?: string }>)
      .filter((l): l is { code: string; name: string; language: string } =>
        isSupportedLocale(l['code']),
      )
      .map((l) => ({
        code: l['code'] as SupportedLocale,
        name: l['name'] ?? l['code'],
        language: l['language'] ?? l['code'],
      })),
  );

  /**
   * Change la locale active.
   * @nuxtjs/i18n persiste automatiquement dans le cookie `i18n_redirected`.
   */
  async function switchLocale(newLocale: SupportedLocale): Promise<void> {
    await i18nSetLocale(newLocale);
  }

  return {
    t,
    /** Locale courante, type strict `SupportedLocale` */
    locale,
    /** Référence brute de @nuxtjs/i18n (string) */
    rawLocale,
    /** Helper : true si locale === 'fr' */
    isFr,
    /** Helper : true si locale === 'en' */
    isEn,
    /** Locales disponibles avec metadata */
    localeOptions,
    /** Change la locale (typé, valide uniquement les locales supportées) */
    switchLocale,
  };
}
