/**
 * useCookieNotice — ST-15.5
 *
 * Gère l'état du bandeau d'information cookies.
 * Cookie posé 1 an (365 jours × 86 400 secondes), clé `cursus.cookie_notice_seen`.
 * Pas de cookie tiers, uniquement des cookies essentiels — pas de consentement
 * granulaire requis (doctrine CNIL pour cookies purement fonctionnels).
 */
export function useCookieNotice() {
  const cookie = useCookie<'1' | undefined>('cursus.cookie_notice_seen', {
    maxAge: 365 * 24 * 3600,
    sameSite: 'lax',
    // Note : côté client, `httpOnly` ne peut pas être posé via useCookie —
    // les cookies de bannière sont nécessairement lisibles en JS pour déterminer
    // si le bandeau doit s'afficher. Les cookies auth (session, CSRF) sont eux
    // posés côté serveur avec HttpOnly.
  });

  /** Le bandeau est visible si le cookie est absent (undefined). */
  const isVisible = computed(() => !cookie.value);

  /** Dismissit le bandeau et pose le cookie 1 an. */
  function dismiss(): void {
    cookie.value = '1';
  }

  return { isVisible, dismiss };
}
