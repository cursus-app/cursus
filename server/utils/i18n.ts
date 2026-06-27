/**
 * i18n serveur — singleton de traduction pour les messages API, emails et PDFs.
 *
 * Stratégie :
 * - Les fichiers JSON de locale sont importés statiquement → bundlés au build (pas d'I/O runtime).
 * - L'instance est un singleton module-level : chargée une fois au boot, réutilisée par requête.
 * - Fallback 'fr' si la locale demandée n'est pas supportée.
 *
 * Usage :
 *   import { tServer, parseAcceptLanguage } from '~~/server/utils/i18n';
 *
 *   const msg = tServer('fr', 'errors.notFound');
 *   // → "Page introuvable."
 *
 *   const msg = tServer('en', 'common.save');
 *   // → "Save"
 *
 *   // Avec paramètres d'interpolation :
 *   const msg = tServer('fr', 'molecules.dataTable.pageInfo', { page: 1, total: 5 });
 *   // → "Page 1 sur 5"
 *
 * Cf. ST-19.4 / TT-19.4.1
 */
import type { SupportedLocale } from '~~/shared/types/locale';
import { normalizeSupportedLocale } from '~~/shared/types/locale';
import { logger } from '~~/server/utils/logger';

// Imports statiques — bundlés au build, pas d'I/O par requête
import frMessages from '../../locales/fr.json';
import enMessages from '../../locales/en.json';

// ── Types ─────────────────────────────────────────────────────────────────────

type LocaleMessages = typeof frMessages;
type InterpolationParams = Record<string, string | number>;

// ── Catalogue en mémoire (singleton) ─────────────────────────────────────────

const catalog: Record<SupportedLocale, LocaleMessages> = {
  fr: frMessages,
  en: enMessages,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Résout une clé dot-notation dans un objet imbriqué.
 * Ex : 'common.save' → catalog['fr']['common']['save'] → "Enregistrer"
 */
function resolveKey(messages: Record<string, unknown>, key: string): string | null {
  const parts = key.split('.');
  let current: unknown = messages;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : null;
}

/**
 * Interpolation simple : remplace `{param}` par la valeur correspondante.
 * Format compatible avec @nuxtjs/i18n (ICU-like, mais sans pluralisation côté serveur).
 *
 * Ex : "Page {page} sur {total}" avec { page: 1, total: 5 } → "Page 1 sur 5"
 */
function interpolate(template: string, params: InterpolationParams): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Traduit une clé de message côté serveur.
 *
 * @param locale - Locale cible ('fr' | 'en'). Fallback 'fr' si inconnue.
 * @param key    - Clé dot-notation dans locales/*.json (ex : 'auth.errors.invalidCredentials')
 * @param params - Paramètres d'interpolation optionnels (ex : { count: 5 })
 * @returns Le message traduit, ou la clé elle-même si introuvable (avec log warn).
 */
export function tServer(locale: string, key: string, params?: InterpolationParams): string {
  const safeLocale = normalizeSupportedLocale(locale);
  const messages = catalog[safeLocale] as Record<string, unknown>;

  let resolved = resolveKey(messages, key);

  // Fallback FR si la clé est absente dans la locale demandée
  if (resolved === null && safeLocale !== 'fr') {
    const frFallback = catalog['fr'] as Record<string, unknown>;
    resolved = resolveKey(frFallback, key);
  }

  if (resolved === null) {
    // La clé est introuvable même en fallback FR → retourner la clé brute
    // et logguer un warn pour déclencher l'alerte CI (i18n.missing_key)
    logger.warn(
      { locale: safeLocale, key, surface: 'server', event: 'i18n.missing_key' },
      'i18n.missing_key',
    );
    return key;
  }

  logger.debug({ locale: safeLocale, key, surface: 'server' }, 'i18n.server.render');

  return params ? interpolate(resolved, params) : resolved;
}

/**
 * Retourne les deux traductions d'une clé (fr + en) pour les réponses d'erreur API
 * qui exposent les deux messages (utile pour les clients programmatiques).
 */
export function tServerBilingual(
  key: string,
  params?: InterpolationParams,
): { fr: string; en: string } {
  return {
    fr: tServer('fr', key, params),
    en: tServer('en', key, params),
  };
}

/**
 * Parse le header Accept-Language et retourne la locale la mieux correspondante.
 * Logique côté serveur Nitro — compatible avec RFC 7231 §5.3.5.
 *
 * Ex : "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7" → 'fr'
 * Ex : "en-US,en;q=0.9" → 'en'
 */
export function parseAcceptLanguage(header: string): SupportedLocale {
  if (!header) {
    return 'fr';
  }

  const parts = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return {
        lang: (tag ?? '').trim().split('-')[0]?.toLowerCase() ?? '',
        quality: q !== undefined ? parseFloat(q) : 1,
      };
    })
    .filter((p) => p.lang.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const part of parts) {
    if (part.lang === 'en') {
      return 'en';
    }
    if (part.lang === 'fr') {
      return 'fr';
    }
  }

  return 'fr';
}
