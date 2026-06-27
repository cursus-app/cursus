/**
 * Types partagés pour la localisation — consommés côté client ET serveur.
 * Évite de dupliquer la définition de SupportedLocale entre useAppI18n (client)
 * et server/utils/i18n (serveur).
 *
 * Cf. ST-19.4 / TT-19.4.1
 */

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeSupportedLocale(value: string): SupportedLocale {
  return isSupportedLocale(value) ? value : 'fr';
}
