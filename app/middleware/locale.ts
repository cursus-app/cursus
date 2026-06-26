/**
 * Middleware locale — détecte la langue préférée du navigateur et redirige.
 *
 * Ce middleware complète la détection de @nuxtjs/i18n (detectBrowserLanguage)
 * en gérant le cas serveur-side via le header Accept-Language HTTP.
 *
 * Règles :
 * 1. Ne s'applique qu'à la racine `/` (cohérent avec redirectOn: 'root' de i18n).
 * 2. Si le cookie `i18n_redirected` est déjà posé → ne rien faire (respect du choix user).
 * 3. Sinon, parser Accept-Language et rediriger si EN est préféré.
 * 4. Le fallback est toujours 'fr' (defaultLocale).
 *
 * Note : la détection côté client est gérée par @nuxtjs/i18n.
 * Ce middleware ne tourne qu'au SSR (import.meta.server).
 */

import { isSupportedLocale } from '~/composables/useAppI18n';

const I18N_COOKIE_KEY = 'i18n_redirected';

/**
 * Parse le header Accept-Language et retourne la locale la mieux correspondante.
 * Gère le format standard : "en-US,en;q=0.9,fr;q=0.8"
 */
function parseAcceptLanguage(header: string): 'fr' | 'en' {
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

export default defineNuxtRouteMiddleware((to) => {
  // Ne s'applique qu'à la racine
  if (to.path !== '/') {
    return;
  }

  // Côté serveur uniquement — le client est géré par @nuxtjs/i18n detectBrowserLanguage
  if (import.meta.client) {
    return;
  }

  const event = useRequestEvent();
  if (!event) {
    return;
  }

  // Si le cookie de préférence est déjà posé → respecter le choix de l'utilisateur
  const existingLocale = getCookie(event, I18N_COOKIE_KEY);
  if (existingLocale && isSupportedLocale(existingLocale)) {
    if (existingLocale === 'en') {
      // eslint-disable-next-line link-checker/valid-route -- /en est un préfixe locale i18n, pas une route de page
      return navigateTo('/en', { redirectCode: 302 });
    }
    return;
  }

  // Pas de cookie → détecter depuis Accept-Language
  const acceptLanguage = getHeader(event, 'accept-language') ?? '';
  const detectedLocale = parseAcceptLanguage(acceptLanguage);

  if (detectedLocale === 'en') {
    // Poser le cookie pour les visites suivantes
    setCookie(event, I18N_COOKIE_KEY, 'en', {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      path: '/',
    });
    // eslint-disable-next-line link-checker/valid-route -- /en est un préfixe locale i18n, pas une route de page
    return navigateTo('/en', { redirectCode: 302 });
  }
});
