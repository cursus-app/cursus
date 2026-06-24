/**
 * Middleware global de garde d'authentification.
 * - Routes publiques : redirige /login si l'user est connecté (évite boucles).
 * - Routes protégées : redirige /login si l'user n'est pas connecté.
 *
 * Ce middleware est global (nom sans `.global` suffix = lazy, utilisé dans definePageMeta).
 * Pour un middleware auto-appliqué à toutes les routes, renommer en `auth.global.ts`.
 * Ici, on préfère l'appliquer explicitement sur les pages protégées via definePageMeta
 * pour garder le contrôle granulaire.
 */

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'] as const;

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();
  const isPublicRoute = PUBLIC_ROUTES.some((route) => to.path === route);

  // Non connecté sur route protégée → redirige vers login
  if (!user.value && !isPublicRoute) {
    return navigateTo('/login');
  }

  // Déjà connecté sur page d'auth → redirige vers dashboard.
  // /dashboard est créé dans ST-03.x — route connue mais page pas encore générée.
  if (user.value && isPublicRoute) {
    // eslint-disable-next-line link-checker/valid-route
    return navigateTo('/dashboard');
  }
});
