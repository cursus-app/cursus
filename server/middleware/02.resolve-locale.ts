/**
 * Middleware Nitro 02.resolve-locale — pose `event.context.locale` sur chaque requête.
 *
 * Ordre de résolution :
 * 1. Cookie `i18n_redirected` (posé par @nuxtjs/i18n ou le middleware app/locale.ts)
 * 2. Header `accept-language` HTTP
 * 3. Fallback 'fr' (defaultLocale)
 *
 * Note : la locale DB de l'utilisateur connecté (users.locale) est plus pertinente
 * mais nécessite une requête DB. Elle est résolue lazily dans les handlers qui
 * en ont besoin (ex. : génération d'emails, PDFs), pas ici pour éviter une requête
 * DB systématique sur toutes les routes.
 *
 * Les helpers h3 sont importés explicitement (pas d'auto-import) pour permettre
 * les tests unitaires sans serveur Nitro complet. Cf. 01.request-logger.ts.
 *
 * Cf. ST-19.4 / TT-19.4.5
 */
import { defineEventHandler, getCookie, getHeader } from 'h3';
import { parseAcceptLanguage } from '~~/server/utils/i18n';
import { normalizeSupportedLocale } from '~~/shared/types/locale';

const I18N_COOKIE_KEY = 'i18n_redirected';

export default defineEventHandler((event) => {
  // 1. Cookie de préférence utilisateur (posé par le client après un changement de langue)
  const cookieLocale = getCookie(event, I18N_COOKIE_KEY);
  if (cookieLocale) {
    event.context.locale = normalizeSupportedLocale(cookieLocale);
    return;
  }

  // 2. Accept-Language header
  const acceptLanguage = getHeader(event, 'accept-language') ?? '';
  event.context.locale = parseAcceptLanguage(acceptLanguage);
});
